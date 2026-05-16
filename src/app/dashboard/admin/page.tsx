import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin Hub — PERFORM",
  description: "Global operational controls and system audit logs.",
};

export default async function AdminHubPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = profile ? (profile as any).role : null;

  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Administration Hub
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-[42rem]">
          Manage system-wide settings, audit modification logs, and distribute global targets.
        </p>
      </header>

      {/* Admin Tabs Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">Operational Controls</h3>
          <ul className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
            <li className="cursor-pointer hover:underline">Manage Performance Cycle</li>
            <li className="cursor-pointer hover:underline">Force Unlock Goal Sheet</li>
          </ul>
        </div>
        
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">Global Reports</h3>
          <ul className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
            <li className="cursor-pointer hover:underline">Export Data (CSV)</li>
            <li className="cursor-pointer hover:underline">Compliance Metrics</li>
          </ul>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">Audit Logs</h3>
          <ul className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
            <li className="cursor-pointer hover:underline">View System Activity</li>
            <li className="cursor-pointer hover:underline">Track Locked Modifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
