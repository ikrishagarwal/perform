import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { redirect } from "next/navigation";
import AdminActionsPanel from "./AdminActionsPanel";

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

  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  const { data: activeCycleData } = await supabase
    .from("performance_cycles")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  const activeCycle = activeCycleData as { id: string } | null;

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Administration Hub
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-[42rem]">
          Manage system-wide settings, audit modification logs, and distribute
          global targets.
        </p>
      </header>

      <AdminActionsPanel activeCycleId={activeCycle?.id ?? null} />
    </div>
  );
}
