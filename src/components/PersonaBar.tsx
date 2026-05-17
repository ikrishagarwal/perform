"use client";

import { logout } from "@/app/login/actions";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/database.types";

interface PersonaBarProps {
  currentUser: Profile | null;
}

export default function PersonaBar({ currentUser }: PersonaBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!currentUser) {
    return null;
  }

  const roleColors: Record<string, string> = {
    admin: "bg-error text-on-error",
    manager: "bg-tertiary text-on-tertiary", 
    employee: "bg-primary text-on-primary",
  };

  return (
    <header className="border-b-2 border-on-surface bg-surface px-lg py-md flex items-center justify-between">
      <div className="flex items-center gap-md">
        <div className="text-headline-md font-[800] tracking-tight uppercase">
          GOAL_PORTAL
        </div>
        <span className={`px-sm py-xs text-label-sm font-[700] uppercase ${roleColors[currentUser.role] || 'bg-surface-variant text-on-surface-variant'}`}>
          {currentUser.role}
        </span>
      </div>
      <div className="flex items-center gap-lg">
        <div className="flex flex-col items-end">
          <span className="text-label-bold font-[700] text-on-surface">
            {currentUser.full_name}
          </span>
          <span className="text-label-sm text-on-surface-variant">
            {currentUser.title || "No title"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-md py-sm border-2 border-on-surface bg-surface text-on-surface text-label-bold font-[700] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}