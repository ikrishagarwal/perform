"use client";
import { useState, useEffect } from "react";

export default function PersonaBar() {
  const [persona, setPersona] = useState<"Employee" | "Manager" | "Admin">(
    "Employee",
  );

  useEffect(() => {
    // add data attribute for quick CSS hooks in dev previews
    try {
      document.documentElement.setAttribute(
        "data-dev-persona",
        persona.toLowerCase(),
      );
    } catch {
      // noop in non-browser contexts
    }
  }, [persona]);

  return (
    <div className="fixed left-0 right-0 bottom-0 z-60 bg-surface-container-high border-t border-on-surface p-sm flex justify-center items-center gap-md">
      <div className="max-w-7xl w-full px-margin-mobile md:px-margin-desktop flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span className="text-label-sm font-[700] text-on-surface-variant">
            Dev Persona
          </span>
          <div className="border-sharp p-xs bg-surface-container flex items-center gap-xs">
            <button
              onClick={() => setPersona("Employee")}
              className={`px-sm py-xs text-label-sm ${persona === "Employee" ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"} border-sharp btn-neo`}
            >
              Employee
            </button>
            <button
              onClick={() => setPersona("Manager")}
              className={`px-sm py-xs text-label-sm ${persona === "Manager" ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"} border-sharp btn-neo`}
            >
              Manager
            </button>
            <button
              onClick={() => setPersona("Admin")}
              className={`px-sm py-xs text-label-sm ${persona === "Admin" ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"} border-sharp btn-neo`}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="text-label-sm text-on-surface-variant">
          Previewing as:{" "}
          <span className="text-label-bold font-[700] ml-xs">{persona}</span>
        </div>
      </div>
    </div>
  );
}
