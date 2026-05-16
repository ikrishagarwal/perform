"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastType = "success" | "error";

export interface ToastState {
  type: ToastType;
  message: string;
}

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs]);

  const showSuccess = useCallback((message: string) => {
    setToast({ type: "success", message });
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ type: "error", message });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showSuccess,
    showError,
    clearToast,
  };
}
