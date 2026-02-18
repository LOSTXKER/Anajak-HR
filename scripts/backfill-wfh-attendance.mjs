/**
 * Backfill attendance_logs for approved WFH requests
 * ที่ยังไม่มีบันทึกเวลาทำงาน
 *
 * Run: node scripts/backfill-wfh-attendance.mjs
 */

import { createClient } from '../node_modules/@supabase/supabase-js/dist/main/index.js';

const SUPABASE_URL = 'https://mwireimgylkzaqgqhqfe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aXJlaW1neWxremFxZ3FocWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTY3NTUsImV4cCI6MjA4MDc5Mjc1NX0.g61U7UxWW8pp_sWY3wqbHZy9i5rNWyu2SSwnOar1tlk';

// ใช้ anon key (อาจต้องใช้ service role key ถ้า RLS บล็อก)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backfill() {
  console.log('=== WFH Attendance Backfill ===\n');

  // 1. ดึงค่า work_start_time / work_end_time จาก system_settings
  const { data: settings, error: settingsErr } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['work_start_time', 'work_end_time']);

  if (settingsErr) {
    console.error('Failed to fetch settings:', settingsErr.message);
    process.exit(1);
  }

  const settingsMap = {};
  (settings || []).forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

  const workStart = settingsMap['work_start_time'] || '09:00';
  const workEnd   = settingsMap['work_end_time']   || '18:00';

  const [startH, startM] = workStart.split(':').map(Number);
  const [endH,   endM]   = workEnd.split(':').map(Number);
  const totalHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;

  console.log(`Work hours: ${workStart} - ${workEnd} (${totalHours} hrs)\n`);

  // 2. ดึง approved WFH requests ทั้งหมด
  const { data: wfhList, error: wfhErr } = await supabase
    .from('wfh_requests')
    .select('id, employee_id, date')
    .eq('status', 'approved')
    .order('date', { ascending: true });

  if (wfhErr) {
    console.error('Failed to fetch WFH requests:', wfhErr.message);
    process.exit(1);
  }

  console.log(`Found ${wfhList.length} approved WFH requests\n`);

  // 3. ดึง attendance_logs ที่มีอยู่ เพื่อเปรียบเทียบ
  const { data: existingLogs } = await supabase
    .from('attendance_logs')
    .select('employee_id, work_date');

  const existingSet = new Set(
    (existingLogs || []).map(l => `${l.employee_id}_${l.work_date}`)
  );

  // 4. หา WFH ที่ยังไม่มี attendance log
  const missing = wfhList.filter(w => !existingSet.has(`${w.employee_id}_${w.date}`));
  console.log(`Missing attendance logs: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log('✓ Nothing to backfill. All done!');
    return;
  }

  // 5. สร้าง attendance_logs ย้อนหลัง
  let successCount = 0;
  let errorCount = 0;

  for (const wfh of missing) {
    // แปลงเวลา Bangkok → ISO (UTC)
    // Bangkok = UTC+7 → ลบ 7 ชั่วโมง
    const dateStr = wfh.date; // yyyy-MM-dd
    const clockIn  = new Date(`${dateStr}T${workStart}:00+07:00`).toISOString();
    const clockOut = new Date(`${dateStr}T${workEnd}:00+07:00`).toISOString();

    const { error: insertErr } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: wfh.employee_id,
        work_date:   dateStr,
        clock_in_time:  clockIn,
        clock_out_time: clockOut,
        total_hours:    totalHours,
        is_late:        false,
        late_minutes:   0,
        work_mode:      'wfh',
        status:         'present',
        note:           'บันทึกย้อนหลัง WFH (auto-backfill)',
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        // unique conflict - ข้ามไป
        console.log(`  SKIP  ${dateStr} [${wfh.employee_id}] (already exists)`);
      } else {
        console.error(`  ERROR ${dateStr} [${wfh.employee_id}]: ${insertErr.message}`);
        errorCount++;
      }
    } else {
      console.log(`  ✓ Backfilled ${dateStr} [${wfh.employee_id}]`);
      successCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Inserted: ${successCount}`);
  console.log(`  Errors:   ${errorCount}`);
  console.log(`Done.`);
}

backfill().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
