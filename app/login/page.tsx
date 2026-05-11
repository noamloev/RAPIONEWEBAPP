"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { onlineApi } from "@/lib/api-online";
import { saveAuth } from "@/lib/auth";

type ApiError = {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const res = await onlineApi.post("/auth/login", {
        username,
        password,
      });

      const token = res.data?.access_token;
      const user = res.data?.user;

      if (!token) {
        throw new Error("No token returned");
      }

      saveAuth(token, user);
      router.push("/");
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const detail = apiError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : apiError.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(192,38,211,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(168,85,247,0.06)_1px,transparent_1px),linear-gradient(180deg,#fff7fd_0%,#faf1ff_52%,#ffffff_100%)] bg-[size:48px_48px,48px_48px,auto]" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-strong)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-[#2a0d31] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Manager Workspace
            </div>

            <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight text-white">
              Clear control for company data and daily operations.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              RapidOne Manager keeps your products, inventory, daily reporting,
              client follow-up, and staff statistics in one focused workspace.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-sm">
              <p className="text-sm font-medium text-white">
                Daily reporting
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Run operations, review flags, and track progress without visual noise.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-sm">
              <p className="text-sm font-medium text-white">
                Data-first interface
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Pink and purple operational surfaces with amber highlights for items that need attention.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--card-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                <BarChart3 className="h-3.5 w-3.5" />
                Welcome back
              </div>

              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Access your RapidOne Manager workspace
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-fuchsia-100">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Username
                </label>
                <div className="flex items-center gap-3">
                  <UserRound className="h-4 w-4 text-[var(--primary)]" />
                  <input
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-fuchsia-100">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Password
                </label>
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-4 w-4 text-[var(--primary)]" />
                  <input
                    placeholder="Enter password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-none bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--primary-strong)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(192,38,211,0.28)] transition hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-4 focus:ring-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
