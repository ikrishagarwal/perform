import React from "react";
import type { Metadata } from "next";
import VisualLanding from "../components/VisualLanding";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "PERFORM — Precision in Alignment",
  description:
    "A high-stakes goal tracking system engineered for high-performers who value absolute clarity. Structured OKR management with real-time validation.",
};

export default async function Page() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800;900&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />

      <VisualLanding profile={profile} />
    </>
  );
}
