import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadMigrationEnv, required, log, logSection } from "./helpers.mjs";

const env = loadMigrationEnv();
const oldClient = new pg.Client({ connectionString: required(env, "OLD_DB_URL"), ssl: { rejectUnauthorized: false } });
const newClient = new pg.Client({ connectionString: required(env, "NEW_DB_URL"), ssl: { rejectUnauthorized: false } });

await oldClient.connect();
await newClient.connect();

logSection("1. Compare Auth Users");

const { rows: oldUsers } = await oldClient.query(
  "SELECT id, email, encrypted_password, email_confirmed_at, aud, role FROM auth.users ORDER BY email"
);
const { rows: newUsers } = await newClient.query(
  "SELECT id, email, encrypted_password, email_confirmed_at, aud, role FROM auth.users ORDER BY email"
);

log(`Old: ${oldUsers.length} users, New: ${newUsers.length} users\n`);

const newUserMap = new Map(newUsers.map(u => [u.email, u]));

for (const old of oldUsers) {
  const nw = newUserMap.get(old.email);
  if (!nw) {
    log(`MISSING: ${old.email}`);
    continue;
  }

  const idMatch = old.id === nw.id;
  const pwMatch = old.encrypted_password === nw.encrypted_password;
  const emailConfirmed = !!nw.email_confirmed_at;

  log(`${old.email}:`);
  log(`  ID match: ${idMatch} (old=${old.id.slice(0,8)}... new=${nw.id.slice(0,8)}...)`);
  log(`  Password match: ${pwMatch}`);
  log(`  Email confirmed: ${emailConfirmed} (old=${old.email_confirmed_at ? 'yes' : 'no'}, new=${nw.email_confirmed_at ? 'yes' : 'no'})`);
  log(`  Aud: ${nw.aud}, Role: ${nw.role}`);

  if (!pwMatch) {
    log(`  OLD pw: ${old.encrypted_password?.slice(0, 20)}...`);
    log(`  NEW pw: ${nw.encrypted_password?.slice(0, 20)}...`);
  }
  log("");
}

logSection("2. Fix Password Hashes & Confirmation");

let fixed = 0;
for (const old of oldUsers) {
  try {
    await newClient.query(`
      UPDATE auth.users SET
        encrypted_password = $1,
        email_confirmed_at = COALESCE($2, NOW()),
        aud = 'authenticated',
        role = 'authenticated'
      WHERE id = $3
    `, [old.encrypted_password, old.email_confirmed_at, old.id]);
    fixed++;
    log(`  Fixed: ${old.email}`);
  } catch (e) {
    log(`  FAIL ${old.email}: ${e.message.slice(0, 100)}`);
  }
}
log(`\nFixed ${fixed}/${oldUsers.length} users`);

logSection("3. Test Login After Fix");

const supabase = createClient(
  required(env, "NEW_SUPABASE_URL"),
  required(env, "NEW_SUPABASE_ANON_KEY")
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: "saruth05@hotmail.com",
  password: "Bestlostxker007"
});

if (error) {
  log(`Login STILL FAILED: ${error.message}`);
  log("\nChecking if the issue is the password itself...");

  // Try admin API to check user status
  const adminSupa = createClient(
    required(env, "NEW_SUPABASE_URL"),
    required(env, "NEW_SUPABASE_SERVICE_KEY")
  );
  const { data: adminData } = await adminSupa.auth.admin.listUsers();
  if (adminData?.users) {
    log(`\nUsers in auth (via admin API): ${adminData.users.length}`);
    for (const u of adminData.users) {
      log(`  ${u.email} - confirmed: ${!!u.email_confirmed_at}, last_sign_in: ${u.last_sign_in_at || 'never'}`);
    }
  }
} else {
  log(`Login SUCCESS: ${data.user.email}`);
  log("Password hashes are working correctly now!");
}

await oldClient.end();
await newClient.end();
