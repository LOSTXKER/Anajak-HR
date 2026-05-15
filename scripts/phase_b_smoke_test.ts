/**
 * Phase B Smoke Test — read-only queries to verify migration success
 * Uses pg directly (no Prisma constructor complexity with v7)
 * Run: npx ts-node scripts/phase_b_smoke_test.ts
 * DO NOT mutate data — SELECT only
 */

import { Client } from 'pg'

const DIRECT_URL = process.env['DIRECT_URL'] || process.env['DATABASE_URL'] || ''

async function main() {
  console.log('=== Phase B Smoke Test ===\n')

  const client = new Client({ connectionString: DIRECT_URL })
  await client.connect()

  // 1. organizations table exists + has 5 rows
  const orgResult = await client.query('SELECT COUNT(*) FROM public.organizations')
  const orgCount = parseInt(orgResult.rows[0].count)
  console.log(`[1] organizations count: ${orgCount} (expected: 5) ${orgCount === 5 ? 'PASS' : 'FAIL'}`)

  // 2. Anajak org exists
  const anajakResult = await client.query("SELECT id, slug FROM public.organizations WHERE slug = 'anajak'")
  const anajak = anajakResult.rows[0]
  console.log(`[2] anajak org exists: ${!!anajak} ${anajak ? 'PASS' : 'FAIL'}`)
  if (anajak) console.log(`    id: ${anajak.id}`)

  // 3. employees — all have organization_id
  const empNullResult = await client.query('SELECT COUNT(*) FROM public.employees WHERE organization_id IS NULL')
  const empNullOrg = parseInt(empNullResult.rows[0].count)
  console.log(`[3] employees with null org_id: ${empNullOrg} (expected: 0) ${empNullOrg === 0 ? 'PASS' : 'FAIL'}`)

  // 4. attendance_logs — all have organization_id
  const attNullResult = await client.query('SELECT COUNT(*) FROM public.attendance_logs WHERE organization_id IS NULL')
  const attNullOrg = parseInt(attNullResult.rows[0].count)
  console.log(`[4] attendance_logs with null org_id: ${attNullOrg} (expected: 0) ${attNullOrg === 0 ? 'PASS' : 'FAIL'}`)

  // 5. Basic employee count
  const empCountResult = await client.query('SELECT COUNT(*) FROM public.employees')
  const empCount = parseInt(empCountResult.rows[0].count)
  console.log(`[5] total employees: ${empCount} PASS`)

  // 6. attendance_logs today
  const todayLogsResult = await client.query(`
    SELECT COUNT(*) FROM public.attendance_logs
    WHERE work_date = CURRENT_DATE
  `)
  const todayLogs = parseInt(todayLogsResult.rows[0].count)
  console.log(`[6] attendance_logs today: ${todayLogs} (active sessions today)`)

  // 7. NOT NULL constraint spot check
  const notNullResult = await client.query(`
    SELECT COUNT(*) FROM information_schema.columns
    WHERE column_name = 'organization_id'
      AND table_schema = 'public'
      AND is_nullable = 'NO'
  `)
  const notNullCount = parseInt(notNullResult.rows[0].count)
  console.log(`[7] tables with org_id NOT NULL: ${notNullCount} (expected: 24) ${notNullCount >= 24 ? 'PASS' : 'FAIL'}`)

  // 8. RLS policies with org filter
  const policyResult = await client.query(`
    SELECT COUNT(*) FROM pg_policies
    WHERE qual LIKE '%current_user_org%' OR with_check LIKE '%current_user_org%'
  `)
  const policyCount = parseInt(policyResult.rows[0].count)
  console.log(`[8] policies with current_user_org() filter: ${policyCount} ${policyCount >= 30 ? 'PASS' : 'FAIL (expected >=30)'}`)

  console.log('\n=== Summary ===')
  const allPass = orgCount === 5 && !!anajak && empNullOrg === 0 && attNullOrg === 0 && notNullCount >= 24 && policyCount >= 30
  console.log(allPass ? 'ALL CHECKS PASS — Phase B migration OK' : 'SOME CHECKS FAILED — review above')

  await client.end()
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED:', e.message)
  process.exit(1)
})
