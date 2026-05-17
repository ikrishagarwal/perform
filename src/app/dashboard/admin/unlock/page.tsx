"use client";

import { useState, useTransition, useEffect } from "react";
import { adminUnlockSheet } from "@/lib/actions/admin.actions";
import { supabase } from "@/lib/supabase/client";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import { Profile, GoalSheet } from "@/lib/database.types";

export default function UnlockPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sheets, setSheets] = useState<GoalSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  const loadData = async () => {
    const [sheetsRes, profilesRes] = await Promise.all([
      supabase.from("goal_sheets").select("*").eq("status", "locked"),
      supabase.from("profiles").select("*"),
    ]);
    setSheets(sheetsRes.data || []);
    setProfiles(profilesRes.data || []);
  };

  const handleUnlock = () => {
    if (!selectedSheetId) {
      showError("Select a goal sheet to unlock.");
      return;
    }

    startTransition(async () => {
      try {
        await adminUnlockSheet(selectedSheetId);
        showSuccess("Goal sheet unlocked successfully.");
        setSelectedSheetId("");
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Unlock failed");
      }
    });
  };

  if (sheets.length === 0) {
    loadData();
  }

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);
  const user = profiles.find(p => p.id === selectedSheet?.user_id);

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <NeoToast toast={toast} />

      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Force Unlock Goal Sheet
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Revert a locked goal sheet back to draft status for editing.
        </p>
      </header>

      <div className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]">
        <h3 className="text-headline-md font-[700] mb-md">Locked Goal Sheets</h3>
        
        {sheets.length === 0 ? (
          <div className="text-center py-lg text-on-surface-variant">
            No locked goal sheets found.
          </div>
        ) : (
          <div className="space-y-sm">
            {sheets.map((sheet) => {
              const owner = profiles.find(p => p.id === sheet.user_id);
              return (
                <label
                  key={sheet.id}
                  className={`flex items-center justify-between p-md border-2 cursor-pointer transition-all ${
                    selectedSheetId === sheet.id
                      ? "border-primary bg-primary/10"
                      : "border-on-surface hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-md">
                    <input
                      type="radio"
                      name="sheet"
                      value={sheet.id}
                      checked={selectedSheetId === sheet.id}
                      onChange={(e) => setSelectedSheetId(e.target.value)}
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <div className="text-label-bold font-[700]">{owner?.full_name || "Unknown"}</div>
                      <div className="text-label-sm text-on-surface-variant">
                        Status: {sheet.status} • {new Date(sheet.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-label-sm font-mono text-on-surface-variant">
                    {sheet.id.slice(0, 8)}...
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-lg pt-lg border-t border-on-surface">
          <button
            onClick={handleUnlock}
            disabled={isPending || !selectedSheetId}
            className="px-md py-sm border-2 border-on-surface bg-error text-on-error text-label-bold font-[700] uppercase tracking-[0.05em] disabled:opacity-50 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
          >
            {isPending ? "Unlocking..." : "Force Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}