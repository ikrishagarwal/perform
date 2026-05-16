import { createServerClient } from "@/lib/supabase/server";
import DashboardClientShell from "./DashboardClientShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let currentUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    currentUser = profile;
  }

  return (
    <DashboardClientShell currentUser={currentUser}>
      {children}
    </DashboardClientShell>
  );
}
