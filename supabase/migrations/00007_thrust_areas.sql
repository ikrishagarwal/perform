-- ============================================================
-- Migration 00007: Create thrust_areas table for KPI management
-- Purpose: Allow admins to manage thrust areas site-wide
-- ============================================================

-- 1. Create thrust_areas table
CREATE TABLE public.thrust_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.thrust_areas ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Everyone can read active thrust areas
CREATE POLICY thrust_areas_read_active ON public.thrust_areas
  FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY thrust_areas_full_access ON public.thrust_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Seed default thrust areas
INSERT INTO public.thrust_areas (name, description, sort_order) VALUES
  ('Strategic', 'High-level organizational objectives and long-term goals', 1),
  ('Operational', 'Day-to-day activities and process improvements', 2),
  ('Developmental', 'Skill building, training, and personal growth', 3)
ON CONFLICT (name) DO NOTHING;

-- 5. Create index for performance
CREATE INDEX idx_thrust_areas_active ON public.thrust_areas(is_active) WHERE is_active = true;