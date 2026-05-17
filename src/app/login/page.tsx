"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await login(formData);

      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-margin-mobile md:p-margin-desktop">
      <div className="w-full max-w-[480px] bg-surface-container-lowest border-4 border-on-surface shadow-[8px_8px_0px_0px_#000000] flex flex-col">
        {/* Header */}
        <div className="p-xl border-b-4 border-on-surface bg-surface text-center">
          <h1 className="text-display-md font-[800] uppercase tracking-tighter text-on-surface mb-xs">
            GOAL_PORTAL
          </h1>
          <p className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
            Authorized Personnel Only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-xl flex flex-col gap-lg">
          {error && (
            <div className="p-md bg-error border-2 border-on-surface text-on-error text-label-bold font-[700] tracking-[0.05em] shadow-[4px_4px_0px_0px_#000000]">
              [ERROR] {error}
            </div>
          )}

          

          <div className="flex flex-col gap-xs">
            <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-surface-container-high border-2 border-on-surface p-sm text-body-lg font-[500] text-on-surface focus:outline-none focus:border-primary focus:bg-primary-fixed transition-colors"
              placeholder="user@perform.org"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase">
              Clearance Code (Password)
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-surface-container-high border-2 border-on-surface p-sm text-body-lg font-[500] text-on-surface focus:outline-none focus:border-primary focus:bg-primary-fixed transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`mt-md w-full border-2 border-on-surface p-md text-label-bold font-[700] tracking-[0.05em] uppercase transition-all flex justify-center items-center gap-sm ${
              loading
                ? "bg-surface-variant text-on-surface-variant cursor-wait"
                : "bg-primary text-on-primary shadow-[4px_4px_0px_0px_#1b1b1b] -translate-y-1 hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_#1b1b1b] cursor-pointer"
            }`}
          >
            <span className="material-symbols-outlined">login</span>
            {loading ? "Processing..." : "Authenticate"}
          </button>
        </form>

        
      </div>
    </div>
  );
}
