-- เพิ่ม setting สำหรับเปิด/ปิดการบังคับอนุมัติบัญชีพนักงาน
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('require_account_approval', 'true', 'บังคับอนุมัติบัญชีพนักงานก่อนใช้งาน')
ON CONFLICT (setting_key) DO NOTHING;

SELECT 'require_account_approval setting added!' as message;

