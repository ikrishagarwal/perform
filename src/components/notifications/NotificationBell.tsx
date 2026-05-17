"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/actions/notification.actions";
import type { Notification } from "@/lib/database.types";

interface NotificationBellProps {
  userId: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, 10),
        getUnreadCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
    setIsOpen(false);
  }

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 border-2 border-on-surface bg-surface hover:bg-surface-container-high transition-all"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-on-surface" style={{ fontSize: "20px" }}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-on-error text-label-micro font-[700] border border-on-surface">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-12 w-80 max-h-[400px] bg-surface border-2 border-on-surface shadow-[4px_4px_0px_0px_#000000] z-[100] flex flex-col">
          <div className="flex items-center justify-between p-sm border-b-2 border-on-surface bg-surface-container-lowest">
            <h3 className="text-label-bold font-[700] text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-label-sm text-brand-indigo hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-md text-center text-on-surface-variant text-label-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.target_url ?? "#"}
                  onClick={() => handleNotificationClick(notification)}
                  className={`block p-sm border-b border-border-muted hover:bg-surface-container-high transition-colors ${
                    !notification.is_read ? "bg-surface-container" : ""
                  }`}
                >
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant shrink-0 mt-xs" style={{ fontSize: "18px" }}>
                      {notification.is_read ? "notifications_none" : "circle"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-bold font-[700] text-on-surface truncate">
                        {notification.title}
                      </p>
                      <p className="text-label-sm text-on-surface-variant line-clamp-2 mt-xs">
                        {notification.message}
                      </p>
                      <p className="text-label-micro text-on-surface-variant mt-xs">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}