-- ============================================================
-- EPIC 6: Evidence Capture & Asset Management
-- Migration: Add evidence storage to goals and configure bucket
-- ============================================================

-- 1. Add evidence_url JSONB column to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS evidence_url JSONB DEFAULT '[]'::jsonb;

-- 2. Create storage bucket for evidence attachments
-- (Run this manually in Supabase dashboard or CLI if bucket doesn't exist)
-- Bucket name: evidence_attachments
-- Public: false (private - use signed URLs)

-- 3. Storage RLS policies for evidence_attachments bucket
-- Note: These policies reference the bucket by name

-- Allow authenticated users to upload files to their own sheet's folder
CREATE POLICY "Allow users to upload to own sheet evidence folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence_attachments'
  AND (
    -- Path format: evidence/{sheet_id}/{goal_id}/{file_id}
    -- Users can upload if they own the sheet (checked via function)
    (storage.foldername(name))[1] IN (
      SELECT gs.id::text FROM public.goal_sheets gs
      WHERE gs.employee_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  )
);

-- Allow users to read evidence from sheets they have access to
CREATE POLICY "Allow read access to evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evidence_attachments'
  AND (
    -- Employee can read their own sheet's evidence
    (storage.foldername(name))[1] IN (
      SELECT gs.id::text FROM public.goal_sheets gs
      WHERE gs.employee_id = auth.uid()
    )
    -- Manager can read their direct reports' evidence
    OR (storage.foldername(name))[1] IN (
      SELECT gs.id::text FROM public.goal_sheets gs
      WHERE EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = gs.employee_id
        AND p.manager_id = auth.uid()
      )
    )
    -- Admins can read all
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  )
);

-- Allow users to delete their own uploaded evidence
CREATE POLICY "Allow delete own evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evidence_attachments'
  AND (
    -- Users can delete from their own sheet folders
    (storage.foldername(name))[1] IN (
      SELECT gs.id::text FROM public.goal_sheets gs
      WHERE gs.employee_id = auth.uid()
    )
    -- Admins can delete all
    OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  )
);

-- 4. Index for faster evidence lookups by goal
CREATE INDEX idx_goals_evidence ON public.goals USING GIN (evidence_url jsonb_path_ops);

-- 5. Grant appropriate permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;