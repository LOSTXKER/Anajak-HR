/**
 * backup-db.mjs — Anajak HR DB Backup Script
 *
 * ใช้ pg_dump สร้าง SQL snapshot ของ Supabase DB
 * Connection source: DIRECT_URL ใน .env.local (direct connection port 5432, ไม่ใช่ pooler)
 *
 * Usage:
 *   node scripts/backup-db.mjs
 *   node scripts/backup-db.mjs --label=pre-phase-b
 *   node scripts/backup-db.mjs --label=pre-phase-b --env=.env.production
 *
 * Requirements:
 *   pg_dump ต้องอยู่ใน PATH
 *   ดาวน์โหลด: https://www.postgresql.org/download/ (เลือก version ที่ตรงกับ Supabase — v15)
 *   หรือ: scoop install postgresql  /  choco install postgresql
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { label: null, envFile: null };
  for (const arg of args) {
    if (arg.startsWith('--label=')) result.label = arg.slice('--label='.length);
    if (arg.startsWith('--env=')) result.envFile = arg.slice('--env='.length);
  }
  return result;
}

/** Load env file manually (no dotenv dep required) */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function nowLabel() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ── check pg_dump ─────────────────────────────────────────────────────────────

function checkPgDump() {
  try {
    const result = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' });
    if (result.status !== 0 || result.error) throw new Error('not found');
    return result.stdout.trim();
  } catch {
    console.error('\n  pg_dump not found in PATH.\n');
    console.error('  Install options:');
    console.error('    Windows  : https://www.postgresql.org/download/windows/');
    console.error('               (เลือก version 15 ให้ตรงกับ Supabase)');
    console.error('               หรือ: scoop install postgresql');
    console.error('               หรือ: choco install postgresql');
    console.error('    macOS    : brew install postgresql@15');
    console.error('    Linux    : sudo apt install postgresql-client-15\n');
    console.error('  หลัง install ให้เพิ่ม bin/ path เข้า PATH แล้วรัน script ใหม่\n');
    process.exit(1);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { label, envFile } = parseArgs();

  // load env
  const envPath = envFile
    ? resolve(PROJECT_ROOT, envFile)
    : join(PROJECT_ROOT, '.env.local');
  loadEnvFile(envPath);

  console.log('\n  Anajak HR — DB Backup');
  console.log('  ─────────────────────────────────────');

  // check pg_dump
  const pgVersion = checkPgDump();
  console.log(`  pg_dump  : ${pgVersion}`);

  // resolve connection string — ใช้ DIRECT_URL (port 5432) เท่านั้น
  // pooler (DATABASE_URL port 6543 + pgbouncer=true) จะ error ใน pg_dump
  const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL_DIRECT;
  if (!connStr) {
    console.error('\n  ERROR: DIRECT_URL not found in env file.');
    console.error('  pg_dump ต้องการ direct connection (port 5432) ไม่ใช่ pooler (port 6543).');
    console.error('\n  วิธีหา DIRECT_URL:');
    console.error('    Supabase Dashboard → Settings → Database');
    console.error('    → Connection string → tab "Direct connection"');
    console.error('    รูปแบบ: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres');
    console.error('\n  เพิ่มใน .env.local:');
    console.error('    DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres\n');
    process.exit(1);
  }

  // validate ว่าไม่ใช่ pooler (warn ถ้าเจอ pgbouncer=true หรือ port 6543)
  if (connStr.includes('pgbouncer=true') || connStr.includes(':6543/')) {
    console.warn('\n  WARNING: connection string ดูเหมือนจะเป็น pooler URL (port 6543 / pgbouncer=true)');
    console.warn('  pg_dump อาจ hang หรือ error กับ pooler — แนะนำใช้ DIRECT_URL (port 5432) แทน\n');
  }

  // check connStr มี password ไหม (กันกรณีลืมใส่)
  if (connStr.includes(':@') || connStr.match(/\/\/[^:]+@/)) {
    console.warn('  WARNING: connection string อาจไม่มี password — ถ้า backup fail ให้ตรวจ DIRECT_URL\n');
  }

  // สร้าง backups/ folder
  const backupsDir = join(PROJECT_ROOT, 'backups');
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
    console.log('  Created : backups/');
  }

  // สร้างชื่อไฟล์
  const ts = nowLabel();
  const safeLabel = (label || 'snapshot').replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename = `${ts}-${safeLabel}.sql`;
  const outPath = join(backupsDir, filename);

  console.log(`  Label    : ${safeLabel}`);
  console.log(`  Output   : backups/${filename}`);
  console.log(`  Env file : ${envPath}`);
  console.log('  ─────────────────────────────────────');
  console.log('  Running pg_dump...\n');

  const startMs = Date.now();

  try {
    // pg_dump flags:
    //   --no-owner   : ไม่ใส่ ALTER OWNER (ต่างกันระหว่าง Supabase project)
    //   --no-acl     : ไม่ใส่ GRANT/REVOKE (ป้องกัน permission error ตอน restore)
    //   --clean      : เพิ่ม DROP statement ก่อน CREATE (ให้ restore overwrite ของเดิมได้)
    //   --if-exists  : ต่อยจาก --clean ป้องกัน error ถ้า table ยังไม่มีตอน restore
    //   --format=plain : plain SQL readable (ดู-แก้ได้, restore ด้วย psql ง่าย)
    //   --schema=public : เอาเฉพาะ public schema (ไม่ได้ backup auth/storage ของ Supabase)
    execSync(
      `pg_dump "${connStr}" --no-owner --no-acl --clean --if-exists --format=plain --schema=public --file="${outPath}"`,
      { stdio: 'inherit', encoding: 'utf8' }
    );
  } catch (err) {
    console.error('\n  pg_dump failed.');
    console.error('  สาเหตุที่พบบ่อย:');
    console.error('    1. connection string ผิด / password ผิด');
    console.error('    2. ใช้ pooler URL แทน direct URL');
    console.error('    3. Supabase ปิด direct connection (ต้อง enable ใน Dashboard → Settings → Database)');
    console.error('    4. Firewall block port 5432\n');
    process.exit(1);
  }

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);

  if (!existsSync(outPath)) {
    console.error('  ERROR: backup file not created (pg_dump อาจ exit เงียบๆ)\n');
    process.exit(1);
  }

  const { size } = statSync(outPath);

  // count tables in backup (เร็วกว่า query DB)
  let tableCount = 0;
  try {
    const content = readFileSync(outPath, 'utf8');
    tableCount = (content.match(/^CREATE TABLE /gm) || []).length;
  } catch {
    // ไม่ critical
  }

  console.log('  ─────────────────────────────────────');
  console.log(`  DONE in ${elapsedSec}s`);
  console.log(`  File   : backups/${filename}`);
  console.log(`  Size   : ${formatBytes(size)}`);
  console.log(`  Tables : ${tableCount} tables backed up`);
  console.log('\n  ⚠  backups/ is gitignored — ไฟล์อยู่บนเครื่องเบสเท่านั้น');
  console.log('     เก็บไว้ใน local / copy ไป safe storage (USB/Drive) ด้วยนะครับ\n');
}

main();
