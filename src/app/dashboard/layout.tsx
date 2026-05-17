import { createServerClient } from "@/lib/supabase/server";
import DashboardClientShell from "./DashboardClientShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log("DashboardLayout: user id =", user?.id);
  
  let currentUser = null;
  if (user) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    console.log("DashboardLayout: profile fetch result:", { profile, error });
    
    if (error) {
      console.error("Error fetching profile:", error);
    } else if (profile) {
      currentUser = profile;
    }
  }

  console.log("DashboardLayout: currentUser =", currentUser);

  return (
    <DashboardClientShell currentUser={currentUser}>
      {children}
    </DashboardClientShell>
  );
}
