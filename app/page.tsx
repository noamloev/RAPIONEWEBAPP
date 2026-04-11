"use client";

import { Activity, AlertTriangle, BadgeDollarSign, Cpu } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useLanguage } from "@/components/language-provider";

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
  const { t } = useLanguage();

  return (
    <PageShell title={t("pages.dashboard.title")}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("pages.dashboard.revenue_today")} value="--" icon={BadgeDollarSign} />
        <StatCard title={t("pages.dashboard.sales_count")} value="--" icon={Activity} />
        <StatCard title={t("pages.dashboard.flags")} value="--" icon={AlertTriangle} />
        <StatCard title={t("pages.dashboard.agent_status")} value="--" icon={Cpu} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[32px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              {t("pages.dashboard.overview")}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
              {t("pages.dashboard.operations_glance")}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t("pages.dashboard.operations_desc")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">{t("pages.dashboard.inventory_health")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                {t("pages.dashboard.stable")}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">{t("pages.dashboard.report_flow")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                {t("shell.ready")}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <p className="text-sm text-[var(--muted)]">{t("pages.dashboard.audit_queue")}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-dark)]">
                {t("pages.dashboard.monitored")}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(165deg,#fff8fb_0%,#f8e4ed_100%)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
            {t("pages.dashboard.workspace_style")}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
            {t("pages.dashboard.luxury_rose_system")}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            {t("pages.dashboard.luxury_rose_desc")}
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              {t("pages.dashboard.premium_sidebar")}
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              {t("pages.dashboard.sticky_header")}
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-[var(--primary-dark)] shadow-sm">
              {t("pages.dashboard.softer_cards")}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}