"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Email atau password tidak valid.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    window.location.assign(safeNext);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-[430px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2864e8] text-lg font-bold text-white">
            N
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#0d1729]">
            ND Creative Factory
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">
            Sign in to access the Nordace creative workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#d9e1ec] bg-white p-7 shadow-sm"
        >
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#334155]">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@nordace.com"
            className="mb-5 h-12 w-full rounded-lg border border-[#cbd5e1] px-4 text-sm outline-none focus:border-[#2864e8] focus:ring-2 focus:ring-[#2864e8]/10"
          />

          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#334155]">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="h-12 w-full rounded-lg border border-[#cbd5e1] px-4 text-sm outline-none focus:border-[#2864e8] focus:ring-2 focus:ring-[#2864e8]/10"
          />

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-12 w-full rounded-lg bg-[#2864e8] px-4 text-sm font-semibold text-white transition hover:bg-[#1f55ca] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#94a3b8]">
          Access is limited to approved Creative Factory users.
        </p>
      </div>
    </main>
  );
}
