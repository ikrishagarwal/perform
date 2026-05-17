-- ============================================================
-- EPIC 7.1: In-App Notification Center
-- Migration: Create notifications table with RLS
-- ============================================================

-- 1. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  target_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX idx_notifications_user_unread 
  ON public.notifications(user_id) 
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_created_at 
  ON public.notifications(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" 
  ON public.notifications
  FOR SELECT 
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Allow service role to insert notifications for any user
CREATE POLICY "Service role can insert notifications" 
  ON public.notifications
  FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() = user_id);

-- 5. Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;