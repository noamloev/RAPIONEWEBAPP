"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Clock3,
  FileBarChart2,
  RefreshCw,
  ShieldAlert,
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
  settings: SettingsSnapshot | null;
};

const EMPTY_STATE: DashboardState = {
  daily: null,
  flags: [],
  alerts: [],
  latestRun: null,
  inactive: null,
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
    if (!value) return t("pages.dashboard.not_yet");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(locale);
  }

  function formatDate(value: string | null): string {
    if (!value) return t("pages.dashboard.never");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(locale);
  }

  function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  function formatDays(days: number[] | undefined): string {
    if (!days || days.length === 0) return t("pages.dashboard.not_configured");
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
    if (!settings) return t("pages.dashboard.not_configured");
    if (settings.daily_report_schedule_mode === "single") {
      return `${formatDays(settings.daily_report_days)} ${t("pages.dashboard.at")} ${formatHour(settings.daily_report_single_hour)}`;
    }
    return `${formatDays(settings.daily_report_days)} | ${formatHour(settings.daily_report_range_start_hour)}-${formatHour(settings.daily_report_range_end_hour)} | ${t("pages.dashboard.every")} ${settings.daily_report_interval_hours}${t("pages.dashboard.hours_short")}`;
  }

  function formatTimeSchedule(days: number[] | undefined, timeValue: string | undefined): string {
    if (!days || days.length === 0 || !timeValue) return t("pages.dashboard.not_configured");
    return `${formatDays(days)} ${t("pages.dashboard.at")} ${timeValue}`;
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
      nextState.settings = requests[5].value.data;
      successCount += 1;
    }

    if (successCount === 0) {
      setError(t("pages.dashboard.load_failed"));
    } else if (successCount < requests.length) {
      setError(t("pages.dashboard.load_partial"));
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
        label: t("pages.dashboard.unread_alerts"),
        value: unreadAlerts,
        tone: unreadAlerts > 0 ? "text-rose-700" : "text-emerald-700",
      },
      {
        label: t("pages.dashboard.low_inventory_alerts"),
        value: lowInventoryAlerts,
        tone: lowInventoryAlerts > 0 ? "text-amber-700" : "text-emerald-700",
      },
      {
        label: t("pages.dashboard.inactive_clients"),
        value: data.inactive?.count ?? 0,
        tone: (data.inactive?.count ?? 0) > 0 ? "text-amber-700" : "text-emerald-700",
      },
      {
        label: t("pages.dashboard.critical_flags_today"),
        value: criticalFlags,
        tone: criticalFlags > 0 ? "text-rose-700" : "text-emerald-700",
      },
    ],
    [criticalFlags, data.inactive?.count, lowInventoryAlerts, t, unreadAlerts]
  );

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
          {refreshing ? t("common.refreshing") : t("pages.dashboard.refresh")}
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
            note={`${t("pages.dashboard.for_date")} ${todayStr}`}
            icon={BadgeDollarSign}
          />
          <MetricCard
            title={t("pages.dashboard.sales_count")}
            value={String(data.daily?.sales_count ?? 0)}
            note={t("pages.dashboard.sales_rows_today")}
            icon={FileBarChart2}
          />
          <MetricCard
            title={t("pages.dashboard.flags")}
            value={String(data.flags.length)}
            note={`${criticalFlags} ${t("pages.dashboard.critical_today")}`}
            icon={ShieldAlert}
          />
          <MetricCard
            title={t("header.alerts")}
            value={String(unreadAlerts)}
            note={`${lowInventoryAlerts} ${t("pages.dashboard.inventory_related")}`}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid gap-6">
          <Panel
            title={t("pages.dashboard.operations_pulse")}
            description={t("pages.dashboard.operations_pulse_desc")}
            className="bg-[linear-gradient(170deg,#fffafc_0%,#ffffff_55%,#fff4f8_100%)]"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                  {t("pages.dashboard.needs_attention")}
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
                  {t("pages.dashboard.last_successful_daily_run")}
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--primary-deep)]">
                  {formatDateTime(data.latestRun?.last_ran_at ?? null)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {t("pages.dashboard.last_run_desc")}
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {t("pages.dashboard.daily_schedule")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--primary-dark)]">
                      {formatDailySchedule(data.settings)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {t("pages.dashboard.receipts_schedule")}
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
                      {t("pages.dashboard.clients_sync_schedule")}
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
        </div>

        <div className="grid gap-6 xl:grid-cols-1">
          <Panel
            title={t("pages.dashboard.follow_up_pressure")}
            description={t("pages.dashboard.follow_up_pressure_desc")}
          >
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="text-sm text-[var(--muted)]">{t("pages.dashboard.inactive_threshold")}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
                {data.inactive?.days ?? data.settings?.follow_up_inactive_days ?? 0} {t("pages.dashboard.days")}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {data.inactive?.count ?? 0} {t("pages.dashboard.clients_need_attention")}
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
                        {client.last_branch || t("pages.dashboard.no_branch")} | {client.mobile || t("pages.dashboard.no_mobile")}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {client.days_since_last}{t("pages.dashboard.days_short")}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {t("pages.dashboard.last_visit")}: {formatDate(client.last_visit)}
                  </p>
                </div>
              ))}

              {(data.inactive?.clients || []).length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                  {t("pages.dashboard.no_inactive_clients")}
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-4 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {t("pages.dashboard.loading")}
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
