"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerClient();

  const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: authError.message };
  }

  if (sessionData?.user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", sessionData.user.id)
        .single() as { data: { is_active: boolean } | null };

      if (profile && typeof profile.is_active === 'boolean' && !profile.is_active) {
        await supabase.auth.signOut();
        return { error: "Account disabled. Contact administrator." };
      }
    } catch (err) {
      // Ignore errors - either column doesn't exist or other issue
      // Allow login to proceed
      console.log("Profile check skipped:", err);
    }
  }

  return { success: true };
}

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
