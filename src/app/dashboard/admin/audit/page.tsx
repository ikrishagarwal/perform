"use client";

import { useState, useEffect } from "react";
import { getAuditLogs } from "@/lib/actions/admin.actions";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLogs({ limit: 50 })
      .then((data) => setLogs(data))
      .catch((err) => {
        console.error("Error fetching audit logs:", err);
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "empty";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Audit Logs
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Track system activity and modification history.
        </p>
      </header>

      {error && (
        <div className="border-2 border-error bg-error-container p-md text-error font-bold">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-xl text-on-surface-variant text-body-lg">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="border-2 border-on-surface bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md block">
            history
          </span>
          <p className="text-body-lg text-on-surface-variant">
            No audit logs found. Logs appear here when changes are made to locked goal sheets.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b-2 border-on-surface pb-md mb-md">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 border-2 border-on-surface rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shadow-[2px_2px_0px_0px_#000000]">
                    {log.user_name ? log.user_name.split(" ").map((n: string) => n[0]).join("").slice(0,2) : "?"}
                  </div>
                  <div>
                    <div className="text-label-bold font-[700] text-on-surface uppercase">
                      {log.user_name || "Unknown User"}
                    </div>
                    <div className="text-label-sm text-on-surface-variant">
                      Modified goal: {log.goal_title || log.goal_id?.slice(0, 8) || "Unknown"}
                    </div>
                  </div>
                </div>
                <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              <div className="space-y-sm">
                {log.changed_fields && log.changed_fields.length > 0 ? (
                  log.changed_fields.map((field: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex flex-col md:flex-row md:items-center gap-xs md:gap-md p-sm bg-surface border border-on-surface"
                    >
                      <div className="text-label-bold font-[700] text-on-surface uppercase min-w-[120px]">
                        {field.field}
                      </div>
                      <div className="flex items-center gap-sm flex-1">
                        <span className="text-body-lg text-error line-through">
                          {formatValue(field.old_value)}
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant">
                          arrow_forward
                        </span>
                        <span className="text-body-lg font-bold text-primary">
                          {formatValue(field.new_value)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-body-lg text-on-surface-variant italic">
                    No changes recorded
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}