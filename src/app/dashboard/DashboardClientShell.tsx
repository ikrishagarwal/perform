"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ─── Navigation Items ─── */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/workspace", label: "Workspace", icon: "edit_square" },
  { href: "/dashboard/review", label: "Manager Review", icon: "group_work" },
  { href: "/dashboard/checkin", label: "Check-in", icon: "analytics" },
];

const FOOTER_ITEMS = [
  { href: "#", label: "Support", icon: "help" },
  { href: "#", label: "Settings", icon: "settings" },
];

/* ─── Desktop Sidebar ─── */
function Sidebar({ currentUser }: { currentUser: any }) {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 bg-surface fixed left-0 top-0 border-r-2 border-on-surface z-50">
      {/* Header */}
      <div className="flex flex-col gap-sm border-b-2 border-on-surface p-md bg-surface-container-lowest">
        <h1 className="text-headline-md font-[800] text-on-surface">
          Track Progress
        </h1>
        <p className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
          Q4 Cycle Active
        </p>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto p-md flex flex-col gap-lg">
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex items-center gap-md bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_#000000] -translate-x-1 -translate-y-1 p-md text-label-bold font-[700] tracking-[0.05em] transition-all duration-100"
                    : "flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high p-md border-2 border-transparent hover:border-on-surface hover:shadow-[2px_2px_0px_0px_#000000] transition-all text-label-bold font-[700] tracking-[0.05em]"
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={
                    isActive
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
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
          <form action={async () => {
            const { logout } = await import("@/app/login/actions");
            await logout();
          }}>
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
            {currentUser?.full_name || "Unknown User"}
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
}: {
  onMenuToggle: () => void;
}) {
  return (
    <header className="md:hidden flex justify-between items-center w-full px-margin-mobile py-sm bg-on-surface text-on-primary border-b-2 border-on-surface sticky top-0 z-50">
      <div className="text-headline-md font-[800] tracking-tighter">
        GOAL_PORTAL
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
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}) {
  const pathname = usePathname();

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
          <span className="text-headline-md font-[800] tracking-tighter text-on-surface">
            GOAL_PORTAL
          </span>
          <button onClick={onClose} className="p-xs hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface">
              close
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-md flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={
                    isActive
                      ? "flex items-center gap-md bg-primary text-on-primary border-2 border-on-surface shadow-[4px_4px_0px_0px_#000000] -translate-x-1 -translate-y-1 p-md text-label-bold font-[700] tracking-[0.05em]"
                      : "flex items-center gap-md text-on-surface-variant hover:bg-surface-container-high p-md border-2 border-transparent hover:border-on-surface transition-all text-label-bold font-[700] tracking-[0.05em]"
                  }
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-auto flex flex-col gap-xs border-t-2 border-on-surface pt-md">
             {/* Logout Mobile */}
            <form action={async () => {
              const { logout } = await import("@/app/login/actions");
              await logout();
            }}>
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
  currentUser: any;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar currentUser={currentUser} />
      <MobileTopBar onMenuToggle={() => setMobileMenuOpen(true)} />
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentUser={currentUser}
      />
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop min-h-screen bg-background">
        {children}
      </main>
    </div>
  );
}
