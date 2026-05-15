/**
 * restore-db.mjs — Anajak HR DB Restore Script
 *
 * ใช้ psql รัน SQL backup file เข้า Supabase DB
 * มี double-confirm กัน accidental overwrite
 *
 * Usage:
 *   node scripts/restore-db.mjs backups/2026-05-19-0900-pre-phase-b.sql
 *   node scripts/restore-db.mjs backups/2026-05-19-0900-pre-phase-b.sql --env=.env.production
 *
 * Requirements:
 *   psql ต้องอยู่ใน PATH (มาพร้อมกับ PostgreSQL installation เดียวกับ pg_dump)
 */

import { spawnSync, execSync } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { file: null, envFile: null };
  for (const arg of args) {
    if (arg.startsWith('--env=')) result.envFile = arg.slice('--env='.length);
    else if (!arg.startsWith('--')) result.file = arg;
  }
  return result;
}

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

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkPsql() {
  try {
    const result = spawnSync('psql', ['--version'], { encoding: 'utf8' });
    if (result.status !== 0 || result.error) throw new Error('not found');
    return result.stdout.trim();
  } catch {
    console.error('\n  psql not found in PATH.');
    console.error('  psql มาพร้อมกับ PostgreSQL installation เดียวกับ pg_dump');
    console.error('  ถ้ายังไม่ได้ install ดูคำแนะนำใน backup-db.mjs\n');
    process.exit(1);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { file, envFile } = parseArgs();

  console.log('\n  Anajak HR — DB Restore');
  console.log('  ─────────────────────────────────────');
  console.log('  !!!  WARNING: DESTRUCTIVE OPERATION  !!!');
  console.log('  Restore จะ OVERWRITE ข้อมูลใน DB ปัจจุบัน');
  console.log('  ─────────────────────────────────────\n');

  if (!file) {
    console.error('  ERROR: ต้องระบุไฟล์ backup');
    console.error('  Usage: node scripts/restore-db.mjs backups/YYYY-MM-DD-HHmm-label.sql\n');
    process.exit(1);
  }

  const filePath = resolve(PROJECT_ROOT, file);

  if (!existsSync(filePath)) {
    console.error(`  ERROR: ไฟล์ไม่พบ: ${filePath}\n`);
    process.exit(1);
  }

  const { size } = statSync(filePath);
  console.log(`  Restore file : ${basename(filePath)}`);
  console.log(`  File size    : ${formatBytes(size)}`);

  // load env
  const envPath = envFile
    ? resolve(PROJECT_ROOT, envFile)
    : resolve(PROJECT_ROOT, '.env.local');
  loadEnvFile(envPath);
  console.log(`  Env file     : ${envPath}\n`);

  // check psql
  const psqlVersion = checkPsql();
  console.log(`  psql         : ${psqlVersion}\n`);

  // resolve connection string
  const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL_DIRECT;
  if (!connStr) {
    console.error('  ERROR: DIRECT_URL not found in env file.');
    console.error('  Restore ต้องการ direct connection (port 5432)\n');
    process.exit(1);
  }

  // ── CONFIRM 1 ────────────────────────────────────────────────────────────
  console.log('  ─────────────────────────────────────');
  console.log('  CONFIRM 1 of 2');
  console.log(`  ไฟล์: ${basename(filePath)}`);
  console.log('  ข้อมูลใน DB จะถูก overwrite — ย้อนกลับไม่ได้ถ้าไม่มี backup ใหม่\n');

  const confirm1 = await prompt("  พิมพ์ 'RESTORE' เพื่อยืนยัน (หรือ Enter เพื่อยกเลิก): ");
  if (confirm1 !== 'RESTORE') {
    console.log('\n  ยกเลิก restore\n');
    process.exit(0);
  }

  // ── CONFIRM 2 ────────────────────────────────────────────────────────────
  console.log('\n  CONFIRM 2 of 2 — ยืนยันอีกครั้ง');
  console.log('  คุณแน่ใจ 100% ว่าต้องการ restore DB ใช่ไหม?\n');

  const confirm2 = await prompt("  พิมพ์ 'RESTORE' อีกครั้งเพื่อดำเนินการ: ");
  if (confirm2 !== 'RESTORE') {
    console.log('\n  ยกเลิก restore\n');
    process.exit(0);
  }

  console.log('\n  ─────────────────────────────────────');
  console.log('  Running psql restore...\n');

  const startMs = Date.now();

  try {
    execSync(
      `psql "${connStr}" -f "${filePath}"`,
      { stdio: 'inherit', encoding: 'utf8' }
    );
  } catch (err) {
    console.error('\n  psql restore failed.');
    console.error('  สาเหตุที่พบบ่อย:');
    console.error('    1. connection string ผิด / password ผิด');
    console.error('    2. ไฟล์ backup เสีย (truncated หรือ binary แทน SQL)');
    console.error('    3. Supabase ปิด direct connection');
    console.error('    4. ไฟล์ backup มาจาก schema version ต่างกัน\n');
    console.error('  TIP: ดู error log ข้างบนหา "ERROR:" line แรก\n');
    process.exit(1);
  }

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);

  console.log('  ─────────────────────────────────────');
  console.log(`  RESTORE COMPLETE in ${elapsedSec}s`);
  console.log(`  Source: ${basename(filePath)}`);
  console.log('\n  ตรวจสอบ app ด้วย npm run dev ว่าข้อมูลถูกต้องก่อนใช้งาน\n');
}

main();
