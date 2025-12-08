-- ตั้งค่า Supabase Storage สำหรับเก็บรูปภาพการเข้างาน

-- สร้าง Storage Bucket สำหรับรูปถ่ายการเข้างาน
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-photos',
  'attendance-photos',
  true, -- public access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- สร้าง Storage Policy: อนุญาตให้ authenticated users อัปโหลดได้
DROP POLICY IF EXISTS "Authenticated users can upload attendance photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload attendance photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attendance-photos');

-- สร้าง Storage Policy: อนุญาตให้ authenticated users อ่านได้
DROP POLICY IF EXISTS "Authenticated users can read attendance photos" ON storage.objects;
CREATE POLICY "Authenticated users can read attendance photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attendance-photos');

-- สร้าง Storage Policy: อนุญาตให้ public อ่านได้ (เพราะ bucket เป็น public)
DROP POLICY IF EXISTS "Public can read attendance photos" ON storage.objects;
CREATE POLICY "Public can read attendance photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'attendance-photos');

-- สร้าง Storage Policy: อนุญาตให้ authenticated users ลบรูปของตัวเองได้
DROP POLICY IF EXISTS "Users can delete their own attendance photos" ON storage.objects;
CREATE POLICY "Users can delete their own attendance photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attendance-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

SELECT 'Supabase Storage setup completed!' as message;

