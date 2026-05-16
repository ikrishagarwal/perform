"use client";

import type { ToastState } from "@/hooks/useToast";

interface NeoToastProps {
  toast: ToastState | null;
}

export default function NeoToast({ toast }: NeoToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed right-md top-md z-[220]">
      <div
        className={`border-2 border-on-surface px-md py-sm shadow-[6px_6px_0px_0px_#000000] text-label-bold font-[700] tracking-[0.02em] ${
          toast.type === "success"
            ? "bg-primary-fixed text-on-primary-fixed"
            : "bg-error-container text-on-error-container"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
