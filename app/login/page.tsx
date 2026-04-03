"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { onlineApi } from "@/lib/api-online";
import { saveAuth } from "@/lib/auth";

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
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,215,227,0.95),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(182,95,132,0.12),transparent_22%),linear-gradient(180deg,#fffafc_0%,#fff6fa_55%,#fffdfd_100%)]" />

      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-[var(--border)] bg-white/72 shadow-[var(--shadow-strong)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-[linear-gradient(160deg,#fff8fb_0%,#f8e4ed_45%,#f3d3df_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary-dark)]">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Workspace
            </div>

            <h1 className="mt-8 max-w-md text-5xl font-semibold leading-tight text-[var(--primary-deep)]">
              Elegant control for inventory and operations.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted-strong)]">
              RapidOne Manager keeps your products, inventory, daily reporting,
              and staff statistics in one refined dashboard experience.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm">
              <p className="text-sm font-medium text-[var(--primary-dark)]">
                Daily reporting
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Run operations, review flags, and track progress in a cleaner workspace.
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm">
              <p className="text-sm font-medium text-[var(--primary-dark)]">
                Luxury rose UI
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Soft blush surfaces, premium contrast, and modern glass styling.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--card-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                Welcome back
              </div>

              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--primary-deep)]">
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
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 transition focus-within:border-[var(--border-strong)] focus-within:bg-white">
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

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 transition focus-within:border-[var(--border-strong)] focus-within:bg-white">
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
                className="w-full rounded-[24px] bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(159,79,114,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_34px_rgba(159,79,114,0.4)] disabled:opacity-60"
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