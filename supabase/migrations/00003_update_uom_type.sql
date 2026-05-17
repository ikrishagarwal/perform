-- Add new percentage types to the existing uom_type enum
-- Note: In Postgres, you cannot run ALTER TYPE ... ADD VALUE inside a transaction block if the type is used in a table.
-- However, standard migrations usually handle this if run separately.

ALTER TYPE public.uom_type ADD VALUE IF NOT EXISTS 'percentage_min';
ALTER TYPE public.uom_type ADD VALUE IF NOT EXISTS 'percentage_max';
