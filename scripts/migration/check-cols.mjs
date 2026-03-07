import pg from "pg";
import { loadMigrationEnv, required } from "./helpers.mjs";
const env = loadMigrationEnv();
const c = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='attendance_logs' ORDER BY ordinal_position`);
console.log(r.rows.map(x => x.column_name + " (" + x.data_type + ")").join("\n"));
await c.end();
