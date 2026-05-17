"use client";

import { useState, useEffect } from "react";
import { getAuditLogs, getComplianceMetrics } from "@/lib/actions/admin.actions";
import { AuditLog } from "@/lib/database.types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs({ limit: 100 })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

      <div className="border-2 border-on-surface bg-surface-container-lowest overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface border-b-2 border-on-surface">
            <tr>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Timestamp</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">User</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Action</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Target</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-on-surface/20">
                <td className="p-sm text-body-lg whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-sm text-body-lg">{log.user_email || "System"}</td>
                <td className="p-sm text-body-lg">
                  <span className="px-sm py-xs border border-primary text-primary text-label-bold font-[700] uppercase text-xs">
                    {log.action}
                  </span>
                </td>
                <td className="p-sm text-body-lg">{log.target_type || "-"}</td>
                <td className="p-sm text-body-lg text-on-surface-variant max-w-xs truncate">
                  {log.details || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-lg text-center text-on-surface-variant">Loading...</div>
        )}
        {!loading && logs.length === 0 && (
          <div className="p-lg text-center text-on-surface-variant">No audit logs found.</div>
        )}
      </div>
    </div>
  );
}