import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getComplianceMetrics } from "@/lib/actions/admin.actions";

export const metadata: Metadata = {
  title: "Admin Hub — PERFORM",
  description: "Global operational controls and system audit logs.",
};

export default async function AdminHubPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile ? (profile as Profile).role : null;

  if (userRole !== "admin" && userRole !== "manager") {
    redirect("/dashboard");
  }

  const { data: activeCycleData } = await supabase
    .from("performance_cycles")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  const activeCycle = activeCycleData as { id: string } | null;

  let metrics = null;
  if (activeCycle?.id) {
    metrics = await getComplianceMetrics(activeCycle.id);
  }

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Administration Hub
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-[42rem]">
          Manage system-wide settings, audit modification logs, and distribute
          global targets.
        </p>
      </header>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Submission Rate</div>
            <div className="text-headline-lg font-[800] text-primary">{metrics.submissionRate}%</div>
            <div className="text-label-sm text-on-surface-variant">{metrics.submitted} / {metrics.totalEmployees} employees</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Approval Rate</div>
            <div className="text-headline-lg font-[800] text-tertiary">{metrics.approvalRate}%</div>
            <div className="text-label-sm text-on-surface-variant">{metrics.approved} sheets locked</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Pending Review</div>
            <div className="text-headline-lg font-[800] text-on-surface">{metrics.pending}</div>
            <div className="text-label-sm text-on-surface-variant">Requires manager action</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Not Started</div>
            <div className="text-headline-lg font-[800] text-error">{metrics.notStarted}</div>
            <div className="text-label-sm text-on-surface-variant">Missing goal sheets</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <Link
          href="/dashboard/admin/unlock"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-error transition-colors">
            Goal Sheet Controls
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            Force unlock locked goal sheets to allow edits.
          </p>
          <div className="mt-md text-label-bold font-[700] text-error uppercase text-xs">
            Open →
          </div>
        </Link>

        <Link
          href="/dashboard/admin/distribute"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-primary transition-colors">
            Distribute KPI
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            Push shared goals to multiple employees.
          </p>
          <div className="mt-md text-label-bold font-[700] text-primary uppercase text-xs">
            Open →
          </div>
        </Link>

        <Link
          href="/dashboard/admin/audit"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-tertiary transition-colors">
            Audit Logs
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            View system activity and modification history.
          </p>
          <div className="mt-md text-label-bold font-[700] text-tertiary uppercase text-xs">
            Open →
          </div>
        </Link>

        {userRole === "admin" && (
          <Link
            href="/dashboard/admin/employees"
            className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
          >
            <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-secondary transition-colors">
              Employee Management
            </h3>
            <p className="text-body-lg text-on-surface-variant">
              Create, edit, and manage employee accounts.
            </p>
            <div className="mt-md text-label-bold font-[700] text-secondary uppercase text-xs">
              Open →
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}