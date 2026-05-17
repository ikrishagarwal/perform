-- Fix: Convert current_phase to enum type
ALTER TABLE performance_cycles ALTER COLUMN current_phase DROP DEFAULT;
ALTER TABLE performance_cycles 
ALTER COLUMN current_phase TYPE public.quarter_phase 
USING current_phase::public.quarter_phase;
ALTER TABLE performance_cycles ALTER COLUMN current_phase SET DEFAULT 'GOAL_SETTING'::public.quarter_phase;