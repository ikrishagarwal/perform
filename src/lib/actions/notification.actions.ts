"use server";

/* ─────────────────────────────────────────────────────────────
   notification.actions.ts — Server Actions for Notifications
   ───────────────────────────────────────────────────────────── */

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/database.types";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  targetUrl?: string
): Promise<Notification> {
  const db = createAdminClient();

  const insertData = {
    user_id: userId,
    title,
    message,
    target_url: targetUrl ?? null,
    is_read: false,
  };

  // @ts-ignore - Database type not regenerated with notifications table
  const { data, error } = await db
    // @ts-ignore - Database type not regenerated with notifications table
    .from("notifications")
    // @ts-ignore - Database type not regenerated with notifications table
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data as Notification;
}

export async function getNotifications(
  userId: string,
  limit: number = 20
): Promise<Notification[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return (data as Notification[]) ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = await createServerClient();

  const { count, error } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to fetch unread count: ${error.message}`);
  }

  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const db = await createServerClient();

  // @ts-ignore - Database type not regenerated with notifications table
  const { error } = await db
    // @ts-ignore - Database type not regenerated with notifications table
    .from("notifications")
    // @ts-ignore - Database type not regenerated with notifications table
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const db = createAdminClient();

  // @ts-ignore - Database type not regenerated with notifications table
  const { error } = await db
    // @ts-ignore - Database type not regenerated with notifications table
    .from("notifications")
    // @ts-ignore - Database type not regenerated with notifications table
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}