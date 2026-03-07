/**
 * Fix date columns that were shifted by -1 day during migration
 * due to timezone conversion issue (pg client date -> JS Date -> pg import)
 * 
 * Strategy: Read correct dates from old DB, update new DB to match
 */

import pg from "pg";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

// Force pg to return dates as strings, not JS Date objects
oldClient.setTypeParser(1082, val => val); // date
newClient.setTypeParser(1082, val => val);

// ============================================================
// Step 1: Find ALL tables with date columns in public schema
// ============================================================
logSection("Step 1: Find All Date Columns");

const { rows: dateCols } = await oldClient.query(`
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND data_type = 'date'
  ORDER BY table_name, column_name
`);

log("Tables with date columns:");
for (const { table_name, column_name } of dateCols) {
  log(`  ${table_name}.${column_name}`);
}

// ============================================================
// Step 2: Compare date values for each table
// ============================================================
logSection("Step 2: Compare & Fix Date Values");

let totalFixed = 0;

const tableGroups = {};
for (const { table_name, column_name } of dateCols) {
  if (!tableGroups[table_name]) tableGroups[table_name] = [];
  tableGroups[table_name].push(column_name);
}

// Temporarily drop unique constraints that include date columns
const { rows: uniqueConstraints } = await newClient.query(`
  SELECT tc.constraint_name, tc.table_name,
         string_agg(kcu.column_name, ',') as columns
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.constraint_name, tc.table_name
`);

const droppedConstraints = [];
for (const uc of uniqueConstraints) {
  const cols = uc.columns.split(",");
  const hasDateCol = cols.some(c => 
    dateCols.some(dc => dc.table_name === uc.table_name && dc.column_name === c)
  );
  if (hasDateCol) {
    log(`Dropping constraint ${uc.constraint_name} on ${uc.table_name}`);
    const { rows: [def] } = await newClient.query(`
      SELECT pg_get_constraintdef(oid) as def 
      FROM pg_constraint WHERE conname = $1
    `, [uc.constraint_name]);
    droppedConstraints.push({ ...uc, def: def.def });
    await newClient.query(`ALTER TABLE "public"."${uc.table_name}" DROP CONSTRAINT "${uc.constraint_name}"`);
  }
}

for (const [tableName, columns] of Object.entries(tableGroups)) {
  const colSelects = columns.map(c => `"${c}"::text as "${c}"`).join(", ");
  
  const { rows: oldRows } = await oldClient.query(
    `SELECT id, ${colSelects} FROM "public"."${tableName}"`
  );
  const { rows: newRows } = await newClient.query(
    `SELECT id, ${colSelects} FROM "public"."${tableName}"`
  );

  const newMap = Object.fromEntries(newRows.map(r => [r.id, r]));

  let tableFixed = 0;
  let tableChecked = 0;

  for (const oldRow of oldRows) {
    const newRow = newMap[oldRow.id];
    if (!newRow) continue;

    const updates = [];
    const values = [];
    let paramIdx = 1;

    for (const col of columns) {
      tableChecked++;
      if (oldRow[col] === null && newRow[col] === null) continue;
      if (oldRow[col] !== newRow[col]) {
        updates.push(`"${col}" = $${paramIdx}`);
        values.push(oldRow[col]);
        paramIdx++;
        tableFixed++;
      }
    }

    if (updates.length > 0) {
      values.push(oldRow.id);
      await newClient.query(
        `UPDATE "public"."${tableName}" SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
        values
      );
    }
  }

  if (tableFixed > 0) {
    log(`${tableName}: Fixed ${tableFixed} date values (checked ${tableChecked})`);
    totalFixed += tableFixed;
  } else {
    log(`${tableName}: All ${tableChecked} date values OK`);
  }
}

// Re-add dropped constraints
for (const uc of droppedConstraints) {
  log(`Re-adding constraint ${uc.constraint_name} on ${uc.table_name}`);
  await newClient.query(`ALTER TABLE "public"."${uc.table_name}" ADD CONSTRAINT "${uc.constraint_name}" ${uc.def}`);
}

// ============================================================
// Step 3: Verify all dates match now
// ============================================================
logSection("Step 3: Verification");

let allGood = true;

for (const [tableName, columns] of Object.entries(tableGroups)) {
  const colSelects = columns.map(c => `"${c}"::text as "${c}"`).join(", ");

  const { rows: oldRows } = await oldClient.query(
    `SELECT id, ${colSelects} FROM "public"."${tableName}"`
  );
  const { rows: newRows } = await newClient.query(
    `SELECT id, ${colSelects} FROM "public"."${tableName}"`
  );

  const newMap = Object.fromEntries(newRows.map(r => [r.id, r]));
  
  let mismatches = 0;
  for (const oldRow of oldRows) {
    const newRow = newMap[oldRow.id];
    if (!newRow) continue;
    for (const col of columns) {
      if (oldRow[col] !== newRow[col]) mismatches++;
    }
  }

  if (mismatches > 0) {
    log(`STILL WRONG: ${tableName} has ${mismatches} mismatches`);
    allGood = false;
  }
}

if (allGood) {
  log("ALL date columns now match between old and new databases!");
}

// Quick attendance daily check
logSection("Attendance Daily Count Verification");

const { rows: oldDaily } = await oldClient.query(`
  SELECT work_date::text as date, COUNT(*)::int as cnt
  FROM attendance_logs GROUP BY work_date ORDER BY work_date DESC
`);
const { rows: newDaily } = await newClient.query(`
  SELECT work_date::text as date, COUNT(*)::int as cnt
  FROM attendance_logs GROUP BY work_date ORDER BY work_date DESC
`);

const newDailyMap = Object.fromEntries(newDaily.map(r => [r.date, r.cnt]));

let dailyOk = true;
for (const { date, cnt } of oldDaily) {
  const n = newDailyMap[date] || 0;
  if (cnt !== n) {
    log(`DIFF: ${date} old=${cnt} new=${n}`);
    dailyOk = false;
  }
}

if (dailyOk) {
  log("ALL daily attendance counts match perfectly!");
}

await oldClient.end();
await newClient.end();

logSection("DONE");
log(`Total date values fixed: ${totalFixed}`);
