"use client";

import { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader title={title} />

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto max-w-[1600px] space-y-6">
              <section className="glass-card luxury-ring rounded-[32px] border border-[var(--border)] px-6 py-6 shadow-[var(--shadow-soft)] sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                      Workspace
                    </div>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--primary-deep)] sm:text-4xl">
                      {title}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
                      Manage inventory, reporting, statistics, and operational workflows in one polished control panel.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Theme
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                        Luxury Rose
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                        Ready
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}