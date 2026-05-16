-- =============================================================
-- Storage policies: attendance-photos bucket
-- Status: APPLIED 2026-05-16 — bucket + policies live in production
-- Source: setup-storage.sql (reconciled Phase A 2026-05-16)
-- =============================================================

-- Create or update bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-photos',
  'attendance-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Upload policy
DROP POLICY IF EXISTS "Authenticated users can upload attendance photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload attendance photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attendance-photos');

-- Read policy (authenticated)
DROP POLICY IF EXISTS "Authenticated users can read attendance photos" ON storage.objects;
CREATE POLICY "Authenticated users can read attendance photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attendance-photos');

-- Read policy (public)
DROP POLICY IF EXISTS "Public can read attendance photos" ON storage.objects;
CREATE POLICY "Public can read attendance photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'attendance-photos');

-- Delete own photos
DROP POLICY IF EXISTS "Users can delete their own attendance photos" ON storage.objects;
CREATE POLICY "Users can delete their own attendance photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attendance-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
