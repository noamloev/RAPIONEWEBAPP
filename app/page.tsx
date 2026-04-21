"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Clock3,
  FileBarChart2,
  PhoneCall,
  RefreshCw,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { useLanguage } from "@/components/language-provider";

type DailySummary = {
  date: string;
  branch: string | null;
  sales_count: number;
  revenue: number;
};

type FlagRow = {
  flag_date: string | null;
  branch: string | null;
  item_name: string | null;
  invoice_no: string | null;
  reason: string;
  severity: string;
  expected_unit_price: number | null;
  actual_unit_price: number | null;
  line_key: string | null;
};

type AlertRow = {
  id: number;
  level: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

type DailyRunLatest = {
  last_ran_at: string | null;
};

type InactiveClientRow = {
  customer_name: string;
  mobile: string;
  last_visit: string | null;
  days_since_last: number;
  total_visits: number;
  total_spent: number;
  last_branch: string;
};

type InactiveClientsResponse = {
  days: number;
  count: number;
  clients: InactiveClientRow[];
};

type InventoryHistoryRow = {
  action_group_id: string;
  created_at: string | null;
  change_type: string;
  source: string;
  branch_name: string;
  product_code: string;
  product_name: string;
  old_qty: number;
  new_qty: number;
  qty_delta: number;
  related_branch_name: string | null;
  is_reverted: boolean;
};

type SettingsSnapshot = {
  follow_up_inactive_days: number;
  daily_report_schedule_mode: "single" | "range";
  daily_report_single_hour: number;
  daily_report_range_start_hour: number;
  daily_report_range_end_hour: number;
  daily_report_interval_hours: number;
  daily_report_days: number[];
  receipts_check_time: string;
  receipts_check_days: number[];
  clients_sync_time: string;
  clients_sync_days: number[];
};

type DashboardState = {
  daily: DailySummary | null;
  flags: FlagRow[];
  alerts: AlertRow[];
  latestRun: DailyRunLatest | null;
  inactive: InactiveClientsResponse | null;
  history: InventoryHistoryRow[];
  settings: SettingsSnapshot | null;
};

const EMPTY_STATE: DashboardState = {
  daily: null,
  flags: [],
  alerts: [],
  latestRun: null,
  inactive: null,
  history: [],
  settings: null,
};

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof BadgeDollarSign;
}) {
  return (
    <div className="rounded-[30px] border border-[var(--border)] bg-white/90 p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--primary-deep)]">
            {value}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-soft)] text-[var(--primary-dark)] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[32px] border border-[var(--border)] bg-white/90 p-6 shadow-[var(--shadow-card)] ${className}`.trim()}
    >
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-[var(--primary-deep)]">{title}</h3>
        {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ActionLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof FileBarChart2;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--primary-dark)] shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-4 text-base font-semibold text-[var(--primary-deep)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>

        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--primary-dark)]" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<DashboardState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const locale = language === "he" ? "he-IL" : "en-US";
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  function formatDateTime(value: string | null): string {
    if (!value) return "Not yet";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(locale);
  }

  function formatDate(value: string | null): string {
    if (!value) return "Never";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(locale);
  }

  function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  function formatDays(days: number[] | undefined): string {
    if (!days || days.length === 0) return "Not configured";
    const keys = [
      "weekday.sun",
      "weekday.mon",
      "weekday.tue",
      "weekday.wed",
      "weekday.thu",
      "weekday.fri",
      "weekday.sat",
    ];
    return days.map((day) => t(keys[day] || "")).join(", ");
  }

  function formatDailySchedule(settings: SettingsSnapshot | null): string {
    if (!settings) return "Not configured";
    if (settings.daily_report_schedule_mode === "single") {
      return `${formatDays(settings.daily_report_days)} at ${formatHour(settings.daily_report_single_hour)}`;
    }
    return `${formatDays(settings.daily_report_days)} | ${formatHour(settings.daily_report_range_start_hour)}-${formatHour(settings.daily_report_range_end_hour)} | every ${settings.daily_report_interval_hours}h`;
  }

  function formatTimeSchedule(days: number[] | undefined, timeValue: string | undefined): string {
    if (!days || days.length === 0 || !timeValue) return "Not configured";
    return `${formatDays(days)} at ${timeValue}`;
  }

  async function loadDashboard({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    const requests = await Promise.allSettled([
      onlineApi.get<DailySummary>("/report/daily", { params: { date_str: todayStr } }),
      onlineApi.get<FlagRow[]>("/report/flags", { params: { date_str: todayStr } }),
      onlineApi.get<AlertRow[]>("/alerts"),
      onlineApi.get<DailyRunLatest>("/daily-runs/latest"),
      onlineApi.get<InactiveClientsResponse>("/clients/inactive"),
      onlineApi.get<InventoryHistoryRow[]>("/inventory/history", { params: { limit: 6 } }),
      onlineApi.get<SettingsSnapshot>("/settings"),
    ]);

    const nextState: DashboardState = { ...EMPTY_STATE };
    let successCount = 0;

    if (requests[0].status === "fulfilled") {
      nextState.daily = requests[0].value.data;
      successCount += 1;
    }
    if (requests[1].status === "fulfilled") {
      nextState.flags = requests[1].value.data || [];
      successCount += 1;
    }
    if (requests[2].status === "fulfilled") {
      nextState.alerts = requests[2].value.data || [];
      successCount += 1;
    }
    if (requests[3].status === "fulfilled") {
      nextState.latestRun = requests[3].value.data;
      successCount += 1;
    }
    if (requests[4].status === "fulfilled") {
      nextState.inactive = requests[4].value.data;
      successCount += 1;
    }
    if (requests[5].status === "fulfilled") {
      nextState.history = requests[5].value.data || [];
      successCount += 1;
    }
    if (requests[6].status === "fulfilled") {
      nextState.settings = requests[6].value.data;
      successCount += 1;
    }

    if (successCount === 0) {
      setError("Failed to load dashboard data.");
    } else if (successCount < requests.length) {
      setError("Some dashboard sections could not be loaded.");
    }

    setData(nextState);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadAlerts = useMemo(
    () => data.alerts.filter((alert) => !alert.is_read).length,
    [data.alerts]
  );
  const lowInventoryAlerts = useMemo(
    () => data.alerts.filter((alert) => alert.title === "Low stock in warehouse").length,
    [data.alerts]
  );
  const criticalFlags = useMemo(
    () =>
      data.flags.filter((flag) => (flag.severity || "").toUpperCase() === "CRIT").length,
    [data.flags]
  );
  const attentionItems = useMemo(
    () => [
      {
        label: "Unread alerts",
        value: unreadAlerts,
        tone: unreadAlerts > 0 ? "text-rose-700" : "text-emerald-700",
      },
      {
        label: "Low inventory alerts",
        value: lowInventoryAlerts,
        tone: lowInventoryAlerts > 0 ? "text-amber-700" : "text-emerald-700",
      },
      {
        label: "Inactive clients",
        value: data.inactive?.count ?? 0,
        tone: (data.inactive?.count ?? 0) > 0 ? "text-amber-700" : "text-emerald-700",
      },
      {
        label: "Critical flags today",
        value: criticalFlags,
        tone: criticalFlags > 0 ? "text-rose-700" : "text-emerald-700",
      },
    ],
    [criticalFlags, data.inactive?.count, lowInventoryAlerts, unreadAlerts]
  );

  const quickActions = [
    {
      href: "/daily-report",
      title: "Run daily report",
      description: "Open the live daily pipeline and receipts checks.",
      icon: FileBarChart2,
    },
    {
      href: "/follow-up",
      title: "Review inactive clients",
      description: "See who needs contact and how long they have been inactive.",
      icon: PhoneCall,
    },
    {
      href: "/inventory",
      title: "Review inventory changes",
      description: "Open branch inventory, history, and undo actions.",
      icon: Boxes,
    },
    {
      href: "/product-statistics",
      title: "Open product statistics",
      description: "Check the latest monthly product performance.",
      icon: BadgeDollarSign,
    },
    {
      href: "/worker-statistics",
      title: "Open worker statistics",
      description: "Compare consultants and leads from the online flow.",
      icon: Users,
    },
    {
      href: "/settings",
      title: "Open settings",
      description: "Adjust schedules, RapidOne connection, and sync actions.",
      icon: Settings,
    },
  ];

  return (
    <PageShell
      title={t("pages.dashboard.title")}
      headerCenter={
        <button
          onClick={() => loadDashboard({ silent: true })}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/90 px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] shadow-[var(--shadow-card)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh dashboard"}
        </button>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t("pages.dashboard.revenue_today")}
            value={currencyFormatter.format(data.daily?.revenue ?? 0)}
            note={`For ${todayStr}`}
            icon={BadgeDollarSign}
          />
          <MetricCard
            title={t("pages.dashboard.sales_count")}
            value={String(data.daily?.sales_count ?? 0)}
            note="Sales rows loaded for today"
            icon={FileBarChart2}
          />
          <MetricCard
            title={t("pages.dashboard.flags")}
            value={String(data.flags.length)}
            note={`${criticalFlags} critical today`}
            icon={ShieldAlert}
          />
          <MetricCard
            title={t("header.alerts")}
            value={String(unreadAlerts)}
            note={`${lowInventoryAlerts} inventory related`}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            title="Operations Pulse"
            description="This page should tell you what needs attention before you open any detailed report."
            className="bg-[linear-gradient(170deg,#fffafc_0%,#ffffff_55%,#fff4f8_100%)]"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  Needs attention
                </p>
                <div className="mt-4 space-y-3">
                  {attentionItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3"
                    >
                      <span className="text-sm text-[var(--muted-strong)]">{item.label}</span>
                      <span className={`text-lg font-semibold ${item.tone}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  Last successful daily run
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--primary-deep)]">
                  {formatDateTime(data.latestRun?.last_ran_at ?? null)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Use this to see if the daily pipeline already completed recently.
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      Daily schedule
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                      {formatDailySchedule(data.settings)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      Receipts schedule
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                      {formatTimeSchedule(
                        data.settings?.receipts_check_days,
                        data.settings?.receipts_check_time
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      Clients sync schedule
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                      {formatTimeSchedule(
                        data.settings?.clients_sync_days,
                        data.settings?.clients_sync_time
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Quick Actions"
            description="Use the dashboard as a real starting point, not a decorative page."
          >
            <div className="grid gap-3">
              {quickActions.map((item) => (
                <ActionLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                />
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel
            title="Recent Alerts"
            description="Latest server alerts from the bell menu."
          >
            <div className="space-y-3">
              {data.alerts.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  No alerts right now.
                </div>
              ) : (
                data.alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      alert.is_read
                        ? "border-[var(--border)] bg-white"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--primary-deep)]">
                          {alert.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {alert.message || "No details"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-dark)] shadow-sm">
                        {alert.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      {formatDateTime(alert.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title="Inventory Activity"
            description="Most recent inventory changes recorded by the online server."
          >
            <div className="space-y-3">
              {data.history.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  No inventory changes found yet.
                </div>
              ) : (
                data.history.map((row) => (
                  <div
                    key={`${row.action_group_id}-${row.product_code}-${row.branch_name}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--primary-deep)]">
                          {row.product_name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {row.branch_name} | {row.change_type}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.qty_delta >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.qty_delta >= 0 ? `+${row.qty_delta}` : row.qty_delta}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      {formatDateTime(row.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel
            title="Follow-up Pressure"
            description="Clients currently counted as inactive according to your settings."
          >
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="text-sm text-[var(--muted)]">Inactive threshold</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
                {data.inactive?.days ?? data.settings?.follow_up_inactive_days ?? 0} days
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {data.inactive?.count ?? 0} clients currently need attention.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {(data.inactive?.clients || []).slice(0, 5).map((client) => (
                <div
                  key={`${client.mobile}-${client.customer_name}`}
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--primary-deep)]">
                        {client.customer_name || client.mobile}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-strong)]">
                        {client.last_branch || "No branch"} | {client.mobile || "No mobile"}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {client.days_since_last}d
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Last visit: {formatDate(client.last_visit)}
                  </p>
                </div>
              ))}

              {(data.inactive?.clients || []).length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  No inactive clients right now.
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-4 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Loading dashboard data...
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
