"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Profile } from "@/lib/database.types";
import { logout } from "@/app/login/actions";
import NotificationBell from "@/components/notifications/NotificationBell";
import { getCurrentPhase, PhaseInfo } from "@/lib/actions/admin.actions";

const getNavItems = (role?: string) => {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["employee", "manager", "admin"] },
    { href: "/dashboard/workspace", label: "Workspace", icon: "edit_square", roles: ["employee", "manager"] },
    { href: "/dashboard/review", label: "Manager Review", icon: "group_work", roles: ["manager", "admin"] },
    { href: "/dashboard/checkin", label: "Check-in", icon: "analytics", roles: ["employee", "manager"] },
    { href: "/dashboard/admin", label: "Admin Hub", icon: "admin_panel_settings", roles: ["admin"] },
    { href: "/dashboard/admin/employees", label: "Employees", icon: "people", roles: ["admin"], parent: "/dashboard/admin" },
    { href: "/dashboard/admin/audit", label: "Audit Logs", icon: "history", roles: ["admin", "manager"], parent: "/dashboard/admin" },
    { href: "/dashboard/admin/distribute", label: "Distribute KPI", icon: "share", roles: ["admin", "manager"], parent: "/dashboard/admin" },
    { href: "/dashboard/admin/unlock", label: "Unlock Sheets", icon: "lock_open", roles: ["admin", "manager"], parent: "/dashboard/admin" },
    { href: "/dashboard/admin/thrust-areas", label: "Thrust Areas", icon: "category", roles: ["admin"], parent: "/dashboard/admin" },
    { href: "/dashboard/admin/phases", label: "Phase Control", icon: "event_note", roles: ["admin"], parent: "/dashboard/admin" },
  ];
  return items.filter(item => item.roles.includes(role || "employee"));
};

const FOOTER_ITEMS = [
  { href: "#", label: "Support", icon: "help" },
  { href: "#", label: "Settings", icon: "settings" },
];

/* ─── Desktop Sidebar ─── */
function Sidebar({ currentUser, phase }: { currentUser: Profile | null; phase: PhaseInfo | null }) {
  const pathname = usePathname();

  const phaseLabel = phase?.phaseLabel || "Goal Setting";

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 bg-surface fixed left-0 top-0 border-r-2 border-on-surface z-50">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-sm border-b-2 border-on-surface p-md bg-surface-container-lowest">
        <div className="flex flex-col gap-xs">
          <h1 className="text-headline-md font-[800] text-on-surface">
            Track Progress
          </h1>
          <p className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
            {phaseLabel} Active
          </p>
        </div>
        {currentUser && <NotificationBell userId={currentUser.id} />}
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto p-md flex flex-col gap-lg">
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-xs">
          {(() => {
            const items = getNavItems(currentUser?.role || "employee");
            const mainItems = items.filter(item => !item.parent);
            const subItems = items.filter(item => item.parent);
            
            return mainItems.map((item) => {
              const isActive = pathname === item.href;
              const children = subItems.filter(sub => sub.parent === item.href);
              const hasActiveChild = children.some(child => pathname === child.href);
              
              return (
                <div key={item.href} className="flex flex-col">
                  <Link
                    href={item.href}
                    className={
                      isActive || (item.href === "/dashboard/admin" && hasActiveChild)
                        ? "flex items-center gap-md bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_#000000] -translate-x-1 -translate-y-1 p-md text-label-bold font-[700] tracking-[0.05em] transition-all duration-100"
                        : "flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high p-md border-2 border-transparent hover:border-on-surface hover:shadow-[2px_2px_0px_0px_#000000] transition-all text-label-bold font-[700] tracking-[0.05em]"
                    }
                  >
                    <span
                      className="material-symbols-outlined"
                      style={
                        isActive || hasActiveChild
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                  {/* Sub-items */}
                  {children.length > 0 && (
                    <div className="ml-lg mt-xs flex flex-col gap-xs border-l-2 border-on-surface pl-md">
                      {children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={
                              isChildActive
                                ? "flex items-center gap-sm bg-secondary text-on-secondary border-2 border-on-surface shadow-[2px_2px_0px_0px_#000000] -translate-x-1 p-sm text-label-bold font-[700] tracking-[0.05em] transition-all"
                                : "flex items-center gap-sm text-on-surface-variant hover:bg-surface-container-high p-sm border-2 border-transparent hover:border-on-surface transition-all text-label-bold font-[700] tracking-[0.05em]"
                            }
                          >
                            <span className="material-symbols-outlined text-sm">{child.icon}</span>
                            <span className="text-xs">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* CTA Button */}
        <div className="pb-md border-b-2 border-on-surface">
          <Link
            href="/dashboard/workspace"
            className="w-full block bg-on-surface text-surface-container-lowest text-label-bold font-[700] tracking-[0.05em] border border-on-surface py-sm px-md hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all text-center"
          >
            Create New Goal
          </Link>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col gap-xs pt-xs">
          {FOOTER_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high p-md border-2 border-transparent hover:border-on-surface hover:shadow-[2px_2px_0px_0px_#000000] transition-all text-label-bold font-[700] tracking-[0.05em]"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
          {/* Logout Button */}
          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-md text-error hover:bg-error-container hover:text-on-error-container p-md border-2 border-transparent hover:border-error transition-all text-label-bold font-[700] tracking-[0.05em]">
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-sm p-md border-t-2 border-on-surface bg-surface-container-low hover:bg-surface-container transition-colors cursor-default">
        <div className="w-10 h-10 border-2 border-on-surface rounded-full overflow-hidden bg-surface-variant flex items-center justify-center text-label-bold font-[700] tracking-[0.05em] text-on-surface shrink-0 shadow-[2px_2px_0px_0px_#000000]">
          {currentUser?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            currentUser?.full_name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("") || "?"
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase truncate">
            {currentUser?.full_name?.trim() || "User"}
          </span>
          <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant truncate">
            {currentUser?.role || "employee"}
          </span>
        </div>
      </div>
    </nav>
  );
}

/* ─── Mobile Top Bar ─── */
function MobileTopBar({
  onMenuToggle,
  phase,
}: {
  onMenuToggle: () => void;
  phase: PhaseInfo | null;
}) {
  const phaseLabel = phase?.phaseLabel || "Goal Setting";
  
  return (
    <header className="md:hidden flex justify-between items-center w-full px-margin-mobile py-sm bg-on-surface text-on-primary border-b-2 border-on-surface sticky top-0 z-50">
      <div className="flex flex-col">
        <div className="text-headline-md font-[800] tracking-tighter">
          GOAL_PORTAL
        </div>
        <div className="text-label-bold font-[700] text-xs text-on-primary/70">
          {phaseLabel} Active
        </div>
      </div>
      <div className="flex gap-sm">
        <button
          onClick={onMenuToggle}
          className="p-xs hover:bg-primary-container hover:text-on-primary-container transition-all duration-150 rounded"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
}

/* ─── Mobile Slide Menu ─── */
function MobileMenu({
  isOpen,
  onClose,
  currentUser,
  phase,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  phase: PhaseInfo | null;
}) {
  const pathname = usePathname();
  const phaseLabel = phase?.phaseLabel || "Goal Setting";

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Menu Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r-2 border-on-surface flex flex-col shadow-[8px_0px_0px_0px_#000000]">
        <div className="flex justify-between items-center p-md border-b-2 border-on-surface bg-surface-container-lowest">
          <div className="flex flex-col">
            <span className="text-headline-md font-[800] tracking-tighter text-on-surface">
              GOAL_PORTAL
            </span>
            <span className="text-label-bold font-[700] text-xs text-on-surface-variant">
              {phaseLabel} Active
            </span>
          </div>
          <button onClick={onClose} className="p-xs hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface">
              close
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-md flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            {(() => {
              const items = getNavItems(currentUser?.role || "employee");
              const mainItems = items.filter(item => !item.parent);
              const subItems = items.filter(item => item.parent);
              
              return mainItems.map((item) => {
                const isActive = pathname === item.href;
                const children = subItems.filter(sub => sub.parent === item.href);
                const hasActiveChild = children.some(child => pathname === child.href);
                
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={
                        isActive || (item.href === "/dashboard/admin" && hasActiveChild)
                          ? "flex items-center gap-md bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_#000000] -translate-x-1 -translate-y-1 p-md text-label-bold font-[700] tracking-[0.05em]"
                          : "flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high p-md border-2 border-transparent hover:border-on-surface transition-all text-label-bold font-[700] tracking-[0.05em]"
                      }
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                    {children.length > 0 && (
                      <div className="ml-lg mt-xs flex flex-col gap-xs">
                        {children.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onClose}
                              className={
                                isChildActive
                                  ? "flex items-center gap-sm bg-secondary text-on-secondary border-2 border-on-surface shadow-[2px_2px_0px_0px_#000000] -translate-x-1 p-sm text-label-bold font-[700] tracking-[0.05em]"
                                  : "flex items-center gap-sm text-on-surface-variant hover:bg-surface-container-high p-sm border-2 border-transparent hover:border-on-surface transition-all text-label-bold font-[700] tracking-[0.05em]"
                              }
                            >
                              <span className="material-symbols-outlined text-sm">{child.icon}</span>
                              <span className="text-xs">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          
          <div className="mt-auto flex flex-col gap-xs border-t-2 border-on-surface pt-md">
             {/* Logout Mobile */}
            <form action={logout}>
              <button type="submit" className="w-full flex items-center gap-md text-error hover:bg-error-container hover:text-on-error-container p-md border-2 border-transparent hover:border-error transition-all text-label-bold font-[700] tracking-[0.05em]">
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>

        {/* Mobile User Profile */}
        <div className="flex items-center gap-sm p-md border-t-2 border-on-surface bg-surface-container-low">
          <div className="w-10 h-10 border-2 border-on-surface rounded-full overflow-hidden bg-surface-variant flex items-center justify-center text-label-bold font-[700] tracking-[0.05em] text-on-surface shrink-0 shadow-[2px_2px_0px_0px_#000000]">
            {currentUser?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-full h-full object-cover grayscale"
              />
            ) : (
              currentUser?.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "?"
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase truncate">
              {currentUser?.full_name || "Unknown User"}
            </span>
            <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant truncate">
              {currentUser?.role || "employee"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClientShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: Profile | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [phase, setPhase] = useState<PhaseInfo | null>(null);

  useEffect(() => {
    getCurrentPhase().then(setPhase).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar currentUser={currentUser} phase={phase} />
      <MobileTopBar onMenuToggle={() => setMobileMenuOpen(true)} phase={phase} />
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentUser={currentUser}
        phase={phase}
      />
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}
