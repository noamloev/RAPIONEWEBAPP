import { Activity, AlertTriangle, BadgeDollarSign, Cpu } from "lucide-react";
import { PageShell } from "@/components/page-shell";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-[30px] border border-[var(--border)] bg-white/88 p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--primary-deep)]">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-soft)] text-[var(--primary-dark)] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue Today" value="--" icon={BadgeDollarSign} />
        <StatCard title="Sales Count" value="--" icon={Activity} />
        <StatCard title="Flags" value="--" icon={AlertTriangle} />
        <StatCard title="Agent Status" value="--" icon={Cpu} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[32px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              Overview
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
              Operations at a glance
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This area can later show daily trends, recent activity, or pipeline results without changing your actions.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">Inventory Health</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                Stable
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">Report Flow</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                Ready
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">Audit Queue</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                Monitored
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(165deg,#fff8fb_0%,#f8e4ed_100%)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
            Workspace Style
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
            Luxury rose system
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            The app now feels more executive and premium without changing how any of your buttons or workflows behave.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              Premium sidebar navigation
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              Sticky top header
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              Softer cards and cleaner depth
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}