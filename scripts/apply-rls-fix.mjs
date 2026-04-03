import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  // Check existing policies
  const existing = await client.query(`
    SELECT policyname FROM pg_policies WHERE tablename = 'employment_history'
  `);
  console.log("Existing policies:", existing.rows.map(r => r.policyname));

  // Add UPDATE policy if missing
  const hasUpdate = existing.rows.some(r => r.policyname === "employment_history_update");
  if (!hasUpdate) {
    await client.query(`
      CREATE POLICY employment_history_update ON employment_history
        FOR UPDATE USING (true) WITH CHECK (true)
    `);
    console.log("Created UPDATE policy");
  } else {
    console.log("UPDATE policy already exists");
  }

  // Add DELETE policy if missing
  const hasDelete = existing.rows.some(r => r.policyname === "employment_history_delete");
  if (!hasDelete) {
    await client.query(`
      CREATE POLICY employment_history_delete ON employment_history
        FOR DELETE USING (true)
    `);
    console.log("Created DELETE policy");
  } else {
    console.log("DELETE policy already exists");
  }

  // Verify
  const after = await client.query(`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employment_history'
  `);
  console.log("\nFinal policies:");
  after.rows.forEach(r => console.log(`  ${r.cmd}: ${r.policyname}`));

  await client.end();
}

run().catch(console.error);
