import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PERFORM — Precision in Alignment",
  description:
    "Driving organizational accountability through structured data. A high-stakes goal tracking system engineered for high-performers.",
};

export default function LandingPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col overflow-x-hidden">
      {/* ─── Top App Bar ─── */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest border-b border-on-surface">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop h-20 flex justify-between items-center w-full">
          <div className="flex items-center gap-xl">
            <span className="text-headline-md font-[800] tracking-tighter text-on-surface">
              PERFORM
            </span>
            <nav className="hidden md:flex items-center gap-lg">
              <a
                className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant hover:text-primary hover:underline decoration-2 underline-offset-4 transition-colors"
                href="#features"
              >
                Goals
              </a>
              <a
                className="text-label-bold font-[700] tracking-[0.05em] text-primary border-b-2 border-primary"
                href="#alignment"
              >
                Alignment
              </a>
              <a
                className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant hover:text-primary hover:underline decoration-2 underline-offset-4 transition-colors"
                href="#validation"
              >
                Insights
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-md">
            <Link
              href="/dashboard"
              className="text-label-bold font-[700] tracking-[0.05em] text-on-surface bg-surface-container-lowest border-sharp px-lg py-sm btn-neo hidden md:block"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="text-label-bold font-[700] tracking-[0.05em] text-on-tertiary bg-on-surface border-sharp px-lg py-sm btn-neo"
            >
              Start Q4 Cycle
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* ─── Hero Section ─── */}
        <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl md:py-2xl border-b border-on-surface">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
            <div className="md:col-span-8 space-y-lg">
              <h1 className="text-headline-lg-mobile md:text-display-xl font-[800] uppercase leading-none tracking-tighter text-on-surface">
                Precision in
                <br />
                Alignment.
              </h1>
              <p className="text-body-lg font-[400] text-on-surface-variant max-w-2xl border-l-4 border-primary pl-md">
                Driving organizational accountability through structured data. A
                high-stakes goal tracking system engineered for high-performers
                who value clarity over ornamentation.
              </p>
              <div className="pt-md flex flex-col sm:flex-row gap-md">
                <Link
                  href="/dashboard/workspace"
                  className="text-label-bold font-[700] tracking-[0.05em] text-on-tertiary bg-on-surface border-sharp px-lg py-md btn-neo flex items-center justify-center gap-sm"
                >
                  ENTER WORKSPACE
                  <span
                    className="material-symbols-outlined filled-icon"
                  >
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="#features"
                  className="text-label-bold font-[700] tracking-[0.05em] text-on-surface bg-surface-container-lowest border-sharp px-lg py-md btn-neo flex items-center justify-center gap-sm"
                >
                  VIEW MANIFESTO
                </Link>
              </div>
            </div>
            <div className="md:col-span-4 mt-xl md:mt-0 relative h-64 md:h-full min-h-[300px] border-sharp neo-shadow-lg bg-surface-container overflow-hidden">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDprO55W-1lFZQ8deSSO_V3J2a6GNoAamlBQ9LK3yfIuOWTMs9SI2GjWqddQ6vSNq7Nlhs5UlyqEqsE0DONwurgSOLbtQ6POXESPha7_EO9j0Se5aZ0bUCjxWidVbiwHAwScxFgv_RHr4PNWAGzH6gmiH76mVS4yULgDndE_eJ7N7AFnhj6k2ne2TGqW2s4poMCI0n1miPf2J8ScuAy2ydRlmvMzWuajUCbmXqMmEYJgPNgvmIMIz0gTR6HrZ5wWSFoDB50Wdct2GY"
                alt="Data Visualization Dashboard"
                fill
                className="object-cover grayscale opacity-80 mix-blend-multiply"
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* ─── Feature Section: Structured Objectives ─── */}
        <section
          id="features"
          className="w-full border-b border-on-surface bg-surface-bright"
        >
          <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl md:py-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl">
            <div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-[800] uppercase tracking-tighter mb-sm">
                Structured Objectives
              </h2>
              <p className="text-body-md font-[400] text-on-surface-variant max-w-xl">
                The Goal Entry Workspace demands precision. 1px borders define
                the architecture, ensuring every metric is weighed and measured
                with absolute intent.
              </p>
            </div>
            <button className="text-label-bold font-[700] tracking-[0.05em] text-on-surface border-sharp px-md py-sm btn-neo mt-md md:mt-0 flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">tune</span>
              CONFIGURATIONS
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Bento Card 1 */}
            <div className="border-sharp bg-surface-container-lowest p-md neo-shadow flex flex-col gap-md">
              <div className="flex justify-between items-start">
                <span className="text-label-bold font-[700] tracking-[0.05em] uppercase bg-surface-container-high px-sm py-xs border-sharp rounded-sm">
                  Q4-OBJ-01
                </span>
                <span className="material-symbols-outlined text-outline">
                  more_horiz
                </span>
              </div>
              <h3 className="text-headline-md font-[700] tracking-tight leading-tight">
                Increase Market Penetration
              </h3>
              <div className="mt-auto pt-md border-t border-surface-variant flex justify-between items-center">
                <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant">
                  Weightage
                </span>
                <span className="text-label-bold font-[700] tracking-[0.05em] text-primary">
                  35%
                </span>
              </div>
            </div>
            {/* Bento Card 2: Key Results Tracker */}
            <div className="border-sharp bg-surface-container-lowest p-md neo-shadow flex flex-col gap-md md:col-span-2">
              <div className="flex justify-between items-center mb-sm border-b border-on-surface pb-sm">
                <span className="text-label-bold font-[700] tracking-[0.05em] uppercase">
                  Key Results Tracker
                </span>
                <div className="flex gap-xs">
                  <span className="h-2 w-8 bg-on-surface block" />
                  <span className="h-2 w-8 bg-outline-variant block" />
                  <span className="h-2 w-8 bg-outline-variant block" />
                </div>
              </div>
              <div className="space-y-sm">
                <div className="border-sharp p-sm flex items-center justify-between bg-surface-container hover:bg-surface-variant transition-colors cursor-pointer">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary filled-icon">
                      check_box
                    </span>
                    <span className="text-body-md font-[400]">
                      Launch new API documentation
                    </span>
                  </div>
                  <span className="text-label-bold font-[700] tracking-[0.05em]">
                    100%
                  </span>
                </div>
                <div className="border-sharp p-sm flex items-center justify-between bg-surface-container hover:bg-surface-variant transition-colors cursor-pointer">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-outline">
                      check_box_outline_blank
                    </span>
                    <span className="text-body-md font-[400]">
                      Onboard 50 enterprise clients
                    </span>
                  </div>
                  <span className="text-label-bold font-[700] tracking-[0.05em]">
                    42%
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* ─── Feature Section: Radical Clarity + Real-Time Validation ─── */}
        <section
          id="alignment"
          className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl md:py-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {/* Radical Clarity */}
            <div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-[800] uppercase tracking-tighter mb-sm">
                Radical Clarity
              </h2>
              <p className="text-body-md font-[400] text-on-surface-variant mb-xl">
                The Manager Review workflow strips away ambiguity. High-contrast
                status badges enforce decisive action.
              </p>
              <div className="space-y-md">
                {/* Draft card */}
                <div className="border-sharp bg-surface-container-lowest p-md flex items-center justify-between neo-shadow">
                  <div>
                    <h4 className="text-label-bold font-[700] tracking-[0.05em] uppercase">
                      Engineering Alignment
                    </h4>
                    <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant mt-xs">
                      Submitted: Oct 12, 2024
                    </p>
                  </div>
                  <span className="text-label-sm font-[500] tracking-[0.02em] uppercase bg-surface-container-high border-sharp px-sm py-xs flex items-center gap-xs">
                    <span className="w-2 h-2 bg-outline rounded-full block" />
                    Draft
                  </span>
                </div>
                {/* Pending card */}
                <div className="border-sharp bg-surface-container-lowest p-md flex items-center justify-between neo-shadow">
                  <div>
                    <h4 className="text-label-bold font-[700] tracking-[0.05em] uppercase">
                      Product Q4 Targets
                    </h4>
                    <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant mt-xs">
                      Submitted: Oct 14, 2024
                    </p>
                  </div>
                  <span className="text-label-sm font-[500] tracking-[0.02em] uppercase bg-tertiary-fixed border-sharp px-sm py-xs flex items-center gap-xs text-tertiary">
                    <span className="material-symbols-outlined text-[14px]">
                      hourglass_empty
                    </span>
                    Pending
                  </span>
                </div>
                {/* Locked card */}
                <div className="border-sharp bg-surface-container-lowest p-md flex items-center justify-between neo-shadow border-l-4 border-l-primary">
                  <div>
                    <h4 className="text-label-bold font-[700] tracking-[0.05em] uppercase">
                      Sales Expansion
                    </h4>
                    <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant mt-xs">
                      Approved: Oct 15, 2024
                    </p>
                  </div>
                  <span className="text-label-sm font-[500] tracking-[0.02em] uppercase bg-on-surface text-on-tertiary border-sharp px-sm py-xs flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px] filled-icon">
                      lock
                    </span>
                    Locked
                  </span>
                </div>
              </div>
            </div>

            {/* Real-Time Validation */}
            <div
              id="validation"
              className="border-sharp-thick bg-surface-container-lowest p-lg md:p-xl neo-shadow-lg flex flex-col justify-between relative overflow-hidden"
            >
              {/* Subtle dot pattern */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-lg">
                  <h2 className="text-headline-md font-[700] uppercase tracking-tighter">
                    Real-Time Validation
                  </h2>
                  <span className="material-symbols-outlined text-headline-lg">
                    data_usage
                  </span>
                </div>
                <div className="py-xl border-y border-on-surface mb-lg">
                  <div className="text-center">
                    <span className="text-display-xl font-[800] block leading-none">
                      100
                      <span className="text-headline-md">%</span>
                    </span>
                    <span className="text-label-bold font-[700] tracking-[0.05em] uppercase text-on-surface-variant mt-sm block">
                      Total Weightage
                    </span>
                  </div>
                </div>
                <div className="space-y-sm">
                  <div className="flex justify-between items-center text-label-bold font-[700] tracking-[0.05em]">
                    <span>Core Objectives</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full h-4 border-sharp bg-surface-container">
                    <div
                      className="h-full bg-on-surface border-r border-on-surface"
                      style={{ width: "65%" }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-label-bold font-[700] tracking-[0.05em] pt-sm">
                    <span>Stretch Goals</span>
                    <span>35%</span>
                  </div>
                  <div className="w-full h-4 border-sharp bg-surface-container">
                    <div
                      className="h-full bg-primary border-r border-on-surface"
                      style={{ width: "35%" }}
                    />
                  </div>
                </div>
                <div className="mt-lg bg-surface-container-high border-sharp p-sm flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary filled-icon">
                    check_circle
                  </span>
                  <span className="text-label-sm font-[500] tracking-[0.02em] uppercase">
                    Validation Complete. Ready for lock.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-on-surface text-surface w-full mt-auto">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl flex flex-col md:flex-row justify-between items-start gap-lg">
          <div className="flex flex-col gap-sm">
            <span className="text-headline-md font-[800] tracking-tighter">
              PERFORM
            </span>
            <p className="text-label-bold font-[700] tracking-[0.05em] text-surface-variant opacity-80 max-w-xs">
              © 2024 PERFORM PERFORMANCE SYSTEMS. BUILT FOR HIGH-STAKES
              ALIGNMENT.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-lg md:gap-xl">
            <div className="flex flex-col gap-sm">
              <a className="text-label-bold font-[700] tracking-[0.05em] text-surface-variant hover:text-surface transition-colors" href="#">
                Terms of Service
              </a>
              <a className="text-label-bold font-[700] tracking-[0.05em] text-surface-variant hover:text-surface transition-colors" href="#">
                Privacy Protocol
              </a>
            </div>
            <div className="flex flex-col gap-sm">
              <a className="text-label-bold font-[700] tracking-[0.05em] text-surface-variant hover:text-surface transition-colors" href="#">
                Security Standards
              </a>
              <a className="text-label-bold font-[700] tracking-[0.05em] text-surface-variant hover:text-surface transition-colors" href="#">
                Q4 Roadmap
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
