/**
 * Find records where work_date differs between old and new project
 * to understand the timezone shift issue
 */

import pg from "pg";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

logSection("Find Records With Date Shifts");

const { rows: oldRows } = await oldClient.query(
  `SELECT id, work_date::text as work_date, clock_in_time::text as clock_in FROM attendance_logs ORDER BY work_date DESC`
);

const { rows: newRows } = await newClient.query(
  `SELECT id, work_date::text as work_date, clock_in_time::text as clock_in FROM attendance_logs ORDER BY work_date DESC`
);

const newMap = Object.fromEntries(newRows.map(r => [r.id, r]));

let shifted = 0;
let same = 0;
let missing = 0;

log("Records with different work_date:");
log("ID | Old Date | New Date | Old ClockIn | New ClockIn");
log("-".repeat(100));

for (const old of oldRows) {
  const nw = newMap[old.id];
  if (!nw) {
    missing++;
    continue;
  }
  if (old.work_date !== nw.work_date) {
    shifted++;
    log(`${old.id} | ${old.work_date} | ${nw.work_date} | ${old.clock_in || '-'} | ${nw.clock_in || '-'}`);
  } else {
    same++;
  }
}

log(`\nSame: ${same}, Shifted: ${shifted}, Missing from new: ${missing}`);

logSection("Check Timezone Settings");

const { rows: [oldTz] } = await oldClient.query("SHOW timezone");
const { rows: [newTz] } = await newClient.query("SHOW timezone");
log(`Old DB timezone: ${oldTz.TimeZone}`);
log(`New DB timezone: ${newTz.TimeZone}`);

await oldClient.end();
await newClient.end();
