"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";
import { calculateProgress } from "@/lib/progress-engine";
import type { Goal } from "@/lib/database.types";
import gsap from "gsap";

interface VisualLandingProps {
  profile: any | null;
}

export default function VisualLanding({ profile }: VisualLandingProps) {
  const router = useRouter();
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [sheetStatus, setSheetStatus] = useState<string>("PENDING APPROVAL");
  const [cycleYear, setCycleYear] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  // GSAP Animation Refs
  const heroRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const constraintsContainerRef = useRef<HTMLDivElement>(null);
  const logicRef = useRef<HTMLDivElement>(null);

  // Fetch logged in user's real goals for landing page preview
  useEffect(() => {
    if (profile) {
      setIsLoading(true);
      const fetchMyGoals = async () => {
        try {
          const { data: sheet } = await supabase
            .from("goal_sheets")
            .select("id, status, performance_cycles(cycle_year)")
            .eq("employee_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle() as { data: { id: string; status: string; performance_cycles: { cycle_year: number } } | null };

          if (sheet) {
            setSheetStatus(sheet.status.toUpperCase());
            if (sheet.performance_cycles) {
              setCycleYear((sheet.performance_cycles as any).cycle_year);
            }
            const { data: goals } = await supabase
              .from("goals")
              .select("*")
              .eq("goal_sheet_id", sheet.id)
              .order("sort_order", { ascending: true });
            
            if (goals && goals.length > 0) {
              setUserGoals(goals);
            }
          }
        } catch (err) {
          console.error("Error fetching landing preview goals", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMyGoals();
    }
  }, [profile]);

  // GSAP Animations Hook
  useEffect(() => {
    // 1. Hero Entrance Animations (Fade & Slide-Up stagger)
    if (heroRef.current) {
      const children = heroRef.current.children;
      gsap.fromTo(
        children,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
        }
      );
    }

    // 2. Scroll-Triggered Animations via Dynamic Import
    const initScrollAnimations = async () => {
      try {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        // Card Preview Entrance
        if (previewRef.current) {
          gsap.fromTo(
            previewRef.current,
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: previewRef.current,
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // Constraints Stagger Cards Entrance
        if (constraintsContainerRef.current) {
          const cards = constraintsContainerRef.current.querySelectorAll(".constraint-card");
          gsap.fromTo(
            cards,
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: constraintsContainerRef.current,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        // Calculation Logic Entrance
        if (logicRef.current) {
          gsap.fromTo(
            logicRef.current,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: logicRef.current,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      } catch (err) {
        console.error("ScrollTrigger init failed", err);
      }
    };

    initScrollAnimations();
  }, []);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${targetId}`);
    }
  };

  // Default Mock Goals when not logged in
  const mockGoals = [
    {
      id: "mock-1",
      thrust_area: "Engineering",
      title: "Optimize Core Database",
      target_value: "99.9% Uptime",
      actual_achievement: "99.8%",
      weightage: 25,
      progress: 80,
    },
    {
      id: "mock-2",
      thrust_area: "Operations",
      title: "Automate Check-In Sync",
      target_value: "0 Incidents",
      actual_achievement: "0",
      weightage: 15,
      progress: 100,
    },
  ];

  const hasRealGoals = userGoals.length > 0;
  const activeGoals = hasRealGoals
    ? userGoals.map((g) => ({
        id: g.id,
        thrust_area: g.thrust_area,
        title: g.title,
        target_value: g.target_value,
        weightage: g.weightage,
        progress: calculateProgress(g.uom, g.target_value, g.actual_achievement),
      }))
    : mockGoals;

  const totalWeightage = activeGoals.reduce((sum, g) => sum + g.weightage, 0);
  const isSheetValid = totalWeightage === 100 && activeGoals.length <= 8 && activeGoals.every(g => g.weightage >= 10);

  return (
    <div className="bg-surface-container-lowest text-on-surface font-sans antialiased min-h-screen flex flex-col relative pb-0">
      {/* Top Header */}
      <header className="bg-surface border-b-2 border-black sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-margin-desktop h-16 flex justify-between items-center w-full">
          {/* Brand Logo */}
          <div className="flex items-center gap-md">
            <span className="text-headline-md font-black tracking-tighter text-on-surface uppercase select-none">
              PERFORM
            </span>
          </div>

          {/* Navigation links & CTA Buttons */}
          <div className="flex items-center gap-xl">
            <nav className="hidden md:flex items-center gap-lg">
              <a
                className="text-label-bold font-bold text-on-surface-variant hover:text-primary hover:underline decoration-2 underline-offset-4 transition-colors"
                href="#blueprint-live"
                onClick={(e) => handleSmoothScroll(e, "blueprint-live")}
              >
                Live Preview
              </a>
              <a
                className="text-label-bold font-bold text-on-surface-variant hover:text-primary hover:underline decoration-2 underline-offset-4 transition-colors"
                href="#constraints"
                onClick={(e) => handleSmoothScroll(e, "constraints")}
              >
                Constraints
              </a>
              <a
                className="text-label-bold font-bold text-on-surface-variant hover:text-primary hover:underline decoration-2 underline-offset-4 transition-colors"
                href="#logic"
                onClick={(e) => handleSmoothScroll(e, "logic")}
              >
                Calculation Logic
              </a>
            </nav>

            <div className="flex items-center gap-md">
              {profile ? (
                <div className="flex items-center gap-sm">
                  {/* Greeting name, no user role status badge shown */}
                  <span className="hidden sm:inline-block text-label-bold font-bold uppercase text-on-surface mr-sm select-none">
                    {profile.full_name}
                  </span>
                  <Link
                    href="/dashboard"
                    className="text-label-bold font-bold text-white bg-primary border-sharp px-lg py-sm btn-neo neo-shadow uppercase tracking-wider text-xs"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={loggingOut}
                    className="text-label-bold font-bold text-on-surface bg-transparent border-sharp px-sm py-sm btn-neo uppercase text-xs cursor-pointer"
                  >
                    {loggingOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-label-bold font-bold text-white bg-primary border-sharp px-lg py-sm btn-neo neo-shadow uppercase tracking-wider text-xs"
                >
                  Launch Workspace
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-margin-desktop py-2xl border-b border-black text-center">
          <div ref={heroRef} className="max-w-5xl mx-auto space-y-lg flex flex-col items-center">
            <h1 className="text-[54px] md:text-[80px] lg:text-[96px] font-black uppercase leading-[0.9] tracking-tighter text-on-surface w-full">
              REAL-TIME ALIGNMENT.
              <br />
              ZERO SPREADSHEETS.
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mt-md font-medium w-full">
              Removing manual blind spots with a high-stakes goal tracking system
              engineered for high-performers who value absolute clarity.
            </p>
            <div className="pt-md flex justify-center gap-md flex-wrap w-full">
              {profile ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-label-bold font-bold text-white bg-primary border-sharp px-lg py-md btn-neo neo-shadow flex items-center gap-sm uppercase tracking-wider"
                  >
                    Open Workspace Dashboard
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-label-bold font-bold text-on-surface bg-transparent border-sharp px-lg py-md btn-neo flex items-center gap-sm uppercase"
                  >
                    Sign Out Session
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-label-bold font-bold text-white bg-primary border-sharp px-lg py-md btn-neo neo-shadow flex items-center gap-sm uppercase tracking-wider"
                  >
                    Launch Workspace
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    href="/login"
                    className="text-label-bold font-bold text-on-surface bg-transparent border-sharp px-lg py-md btn-neo flex items-center gap-sm uppercase"
                  >
                    Request System Demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Live Component Preview Section */}
        <section
          id="blueprint-live"
          className="max-w-7xl mx-auto px-margin-desktop py-xl border-b border-black bg-surface-container-low overflow-hidden"
        >
          <div className="text-center mb-lg">
            <h2 className="text-body-md font-black uppercase tracking-[0.2em] text-primary mb-xs">
              PORTAL SYSTEM PREVIEW
            </h2>
            <p className="text-[32px] md:text-[40px] font-black uppercase tracking-tight text-on-surface leading-none">
              {hasRealGoals ? `Active Workspace: ${profile?.full_name}` : "Visual Blueprint Preview Card"}
            </p>
          </div>

          <div ref={previewRef} className="border-sharp-thick bg-surface-container-lowest p-0 neo-shadow-lg flex flex-col gap-0 max-w-5xl mx-auto">
            {/* Table Top bar */}
            <div className="flex justify-between items-center p-md border-b-2 border-black bg-surface-container">
              <span className="text-label-bold font-bold uppercase tracking-widest text-on-surface">
                CYCLE YEAR: {cycleYear}
              </span>
              <span className="text-label-bold font-bold uppercase bg-yellow-100 text-[#856404] border-sharp px-sm py-xs text-xs">
                STATUS: {sheetStatus}
              </span>
            </div>

            {/* Main Table Preview */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black bg-surface-container-highest">
                    <th className="p-sm text-label-bold font-bold uppercase border-r border-black">
                      THRUST AREA
                    </th>
                    <th className="p-sm text-label-bold font-bold uppercase border-r border-black">
                      GOAL TITLE
                    </th>
                    <th className="p-sm text-label-bold font-bold uppercase border-r border-black">
                      TARGET
                    </th>
                    <th className="p-sm text-label-bold font-bold uppercase border-r border-black w-24 text-center">
                      WEIGHT
                    </th>
                    <th className="p-sm text-label-bold font-bold uppercase w-48 text-center">
                      PROGRESS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeGoals.map((goal, index) => {
                    const isLast = index === activeGoals.length - 1;
                    return (
                      <tr
                        key={goal.id}
                        className={`hover:bg-surface-bright transition-colors ${
                          !isLast ? "border-b border-black" : ""
                        }`}
                      >
                        <td className="p-sm text-body-md font-medium border-r border-black select-none">
                          {goal.thrust_area}
                        </td>
                        <td className="p-sm text-body-md border-r border-black font-black text-on-surface">
                          {goal.title}
                        </td>
                        <td className="p-sm text-body-md border-r border-black font-medium">
                          {goal.target_value}
                        </td>
                        <td className="p-sm text-body-md border-r border-black text-center font-black text-primary">
                          {goal.weightage}%
                        </td>
                        <td className="p-sm text-center">
                          <div className="flex items-center gap-sm justify-center">
                            <div className="w-full bg-surface-container border-sharp h-4 relative">
                              <div
                                className="bg-primary h-full border-r border-black transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold w-8 text-right font-mono">
                              {goal.progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-sm border-t-2 border-black bg-surface-container text-xs font-bold gap-sm">
              <span className="uppercase text-label-sm">
                TOTAL ENTRIES: {activeGoals.length}/8
              </span>
              <span className="uppercase text-label-sm">
                BALANCE: {totalWeightage}% / 100%
              </span>
              <span
                className={`uppercase border-sharp px-sm py-base flex items-center gap-1 font-black ${
                  isSheetValid
                    ? "text-[#155724] bg-[#d4edda]"
                    : "text-red-700 bg-red-100"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isSheetValid ? "check" : "error"}
                </span>
                STATUS: {isSheetValid ? "VALID" : "INVALID"}
              </span>
            </div>
          </div>
        </section>

        {/* Business Rules & Constraint Matrix */}
        <section id="constraints" className="max-w-7xl mx-auto px-margin-desktop py-2xl border-b border-black">
          <div className="mb-lg text-left">
            <h2 className="text-[42px] md:text-[56px] font-black uppercase tracking-tighter leading-none w-full">
              System Constraints
            </h2>
            <p className="text-on-surface-variant text-body-lg font-medium max-w-xl mt-sm text-left w-full">
              Our relational core implements ironclad business guardrails at both frontend submission and database levels.
            </p>
          </div>
          
          <div ref={constraintsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-0 border-sharp-thick bg-[#f4f4f5]">
            <div className="constraint-card p-xl border-b md:border-b-0 md:border-r border-black flex flex-col gap-md bg-white hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-primary text-[32px]">
                scale
              </span>
              <h3 className="text-[26px] md:text-[32px] font-black uppercase tracking-tight leading-tight w-full">
                The 100% Weightage Rule
              </h3>
              <p className="text-body-md text-on-surface-variant font-medium w-full">
                The system strictly blocks submission unless the sum of all individual
                goal weights equals exactly 100%. No exceptions. This ensures
                comprehensive accountability across the board.
              </p>
            </div>
            <div className="constraint-card p-xl border-b md:border-b-0 md:border-r border-black flex flex-col gap-md bg-white hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-primary text-[32px]">
                bar_chart
              </span>
              <h3 className="text-[26px] md:text-[32px] font-black uppercase tracking-tight leading-tight w-full">
                The 10% Floor Constraint
              </h3>
              <p className="text-body-md text-on-surface-variant font-medium w-full">
                No single objective may carry less than 10% of total weight. If an
                effort is worth tracking in this system, it must represent a
                structurally significant portion of organizational focus.
              </p>
            </div>
            <div className="constraint-card p-xl flex flex-col gap-md bg-white hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-primary text-[32px]">
                lock
              </span>
              <h3 className="text-[26px] md:text-[32px] font-black uppercase tracking-tight leading-tight w-full">
                The 8-Goal Ceiling Cap
              </h3>
              <p className="text-body-md text-on-surface-variant font-medium w-full">
                Focus demands limitation. The system will forcibly freeze any
                additions once 8 top-level goals are established, enforcing extreme
                prioritization over counterproductive goal proliferation.
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Progress & Calculation Showcase */}
        <section id="logic" className="max-w-7xl mx-auto px-margin-desktop py-2xl">
          <div className="mb-lg text-left">
            <h2 className="text-[42px] md:text-[56px] font-black uppercase tracking-tighter leading-none w-full">
              Calculation Logic
            </h2>
            <p className="text-on-surface-variant text-body-lg font-medium max-w-xl mt-sm text-left w-full">
              Empirical calculation formulas implemented in our core analytics engine.
            </p>
          </div>
          <div ref={logicRef} className="border-sharp-thick w-full overflow-x-auto neo-shadow-lg">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-on-surface text-surface uppercase text-label-bold font-bold">
                  <th className="p-md border-r border-surface-variant">
                    Metric Type
                  </th>
                  <th className="p-md border-r border-surface-variant">
                    Logic Definition
                  </th>
                  <th className="p-md">Formula Execution</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black bg-surface-container-lowest hover:bg-surface-bright transition-colors">
                  <td className="p-md text-label-bold font-black uppercase border-r border-black whitespace-nowrap">
                    Numeric MIN
                  </td>
                  <td className="p-md text-body-md text-on-surface-variant font-medium border-r border-black w-full">
                    Higher metrics equal success. Useful for revenue, uptime, and delivery targets.
                  </td>
                  <td className="p-md font-mono text-sm bg-surface-container-low font-bold">
                    {"Progress = (Actual / Target) * 100"}
                  </td>
                </tr>
                <tr className="border-b border-black bg-surface-container-low hover:bg-surface-bright transition-colors">
                  <td className="p-md text-label-bold font-black uppercase border-r border-black whitespace-nowrap">
                    Numeric MAX
                  </td>
                  <td className="p-md text-body-md text-on-surface-variant font-medium border-r border-black w-full">
                    Lower metrics equal success. Engineered for incident rates, error rates, and load latency.
                  </td>
                  <td className="p-md font-mono text-sm bg-surface-container-lowest font-bold">
                    {"Progress = (Target / Actual) * 100"}
                  </td>
                </tr>
                <tr className="bg-surface-container-lowest hover:bg-surface-bright transition-colors">
                  <td className="p-md text-label-bold font-black uppercase border-r border-black whitespace-nowrap">
                    Zero-Based
                  </td>
                  <td className="p-md text-body-md text-on-surface-variant font-medium border-r border-black w-full">
                    Absolute zero is binary success. Ideal for high-stakes zero-tolerance security metrics.
                  </td>
                  <td className="p-md font-mono text-sm bg-surface-container-low font-bold">
                    {"If Actual == 0 Then 100% Else 0%"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer refactored to acquire FULL screen width */}
      <footer className="bg-on-surface text-surface border-t-2 border-on-surface w-full mt-auto py-xl">
        <div className="max-w-7xl mx-auto px-margin-desktop flex flex-col md:flex-row justify-between items-start gap-lg w-full">
          <div className="flex flex-col gap-sm">
            <span className="text-headline-md font-black tracking-tighter text-white uppercase select-none">
              PERFORM
            </span>
            <p className="text-label-bold text-surface-variant opacity-80 max-w-xs normal-case font-[400] text-xs w-full">
              © 2026 PERFORM PERFORMANCE SYSTEMS.
              <br />
              BUILT FOR HACKATHON STAKES ALIGNMENT.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-lg md:gap-xl text-xs font-[700] uppercase tracking-wider text-surface-variant">
            <div className="flex flex-col gap-sm">
              <a
                className="hover:text-white hover:underline transition-colors"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="hover:text-white hover:underline transition-colors"
                href="#"
              >
                Privacy Protocol
              </a>
            </div>
            <div className="flex flex-col gap-sm">
              <a
                className="hover:text-white hover:underline transition-colors"
                href="#"
              >
                Security Standards
              </a>
              <a
                className="hover:text-white hover:underline transition-colors"
                href="#"
              >
                Q4 Roadmap
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
