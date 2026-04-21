"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { useLanguage } from "@/components/language-provider";

type SettingsPayload = {
  consultant_names: string[];
  lead_agent_names: string[];
  stats_cache_minutes: number;
  save_closed_month_stats_to_db: boolean;
  follow_up_inactive_days: number;
  rapidone_base_url: string;
  rapidone_username: string;
  rapidone_password: string;
  rapidone_db_name: string;
  language: "en" | "he";
  daily_report_schedule_mode: "single" | "range";
  daily_report_single_hour: number;
  daily_report_range_start_hour: number;
  daily_report_range_end_hour: number;
  daily_report_interval_hours: number;
  daily_report_days: number[];
  receipts_check_time: string;
  receipts_check_days: number[];
};

type WorkerRow = {
  id: number;
  worker_name: string;
  worker_type: string;
  source: string;
};

type SettingsPageKey =
  | "general"
  | "daily-report"
  | "clients"
  | "inventory"
  | "statistics"
  | "follow-up"
  | "rapidone"
  | "session";

type InventoryLowStockSettings = {
  threshold: number;
};

type ClientsImportStatus = {
  ok: boolean;
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  progress_lines: string[];
  scraped_count: number;
  current_page: number;
  uploading_page: number;
  created: number;
  updated: number;
  skipped: number;
  total_available: number;
  error: string | null;
  result: {
    count: number;
    created: number;
    updated: number;
    skipped: number;
    removed_clients: number;
    removed_activities: number;
    pages: number;
    total_available: number;
  } | null;
};

const CLIENT_IMPORT_JOB_KEY = "rapidone_online_clients_import_job_id";

const DEFAULT_SETTINGS: SettingsPayload = {
  consultant_names: [],
  lead_agent_names: [],
  stats_cache_minutes: 60,
  save_closed_month_stats_to_db: true,
  follow_up_inactive_days: 90,
  rapidone_base_url: "https://anuchka.rapid-image.net",
  rapidone_username: "",
  rapidone_password: "",
  rapidone_db_name: "",
  language: "en",
  daily_report_schedule_mode: "range",
  daily_report_single_hour: 8,
  daily_report_range_start_hour: 8,
  daily_report_range_end_hour: 22,
  daily_report_interval_hours: 2,
  daily_report_days: [0, 1, 2, 3, 4],
  receipts_check_time: "22:00",
  receipts_check_days: [0, 1, 2, 3, 4],
};

const WEEKDAY_OPTIONS = [
  { value: 0, labelKey: "weekday.sun" },
  { value: 1, labelKey: "weekday.mon" },
  { value: 2, labelKey: "weekday.tue" },
  { value: 3, labelKey: "weekday.wed" },
  { value: 4, labelKey: "weekday.thu" },
  { value: 5, labelKey: "weekday.fri" },
  { value: 6, labelKey: "weekday.sat" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

function getErrorMessage(err: unknown, fallback: string) {
  const maybeError = err as {
    message?: string;
    response?: { data?: { detail?: string } };
  };
  const detail = maybeError?.response?.data?.detail;
  return typeof detail === "string" ? detail : maybeError?.message || fallback;
}

function WorkerToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
        checked
          ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,#fff8fb_0%,#f8e7ef_100%)] text-[var(--primary-deep)]"
          : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--primary-dark)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--primary-deep)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SidebarButton({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,#fff8fb_0%,#f6e6ee_100%)] shadow-[0_16px_30px_rgba(159,79,114,0.14)]"
          : "border-[var(--border)] bg-white/82 hover:bg-white"
      }`}
    >
      <div className="text-sm font-semibold text-[var(--primary-deep)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{description}</div>
    </button>
  );
}

function TextInput({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
      />
    </div>
  );
}

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
      >
        {HOUR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function WeekdaySelector({
  days,
  onChange,
  t,
}: {
  days: number[];
  onChange: (days: number[]) => void;
  t: (key: string) => string;
}) {
  function toggleDay(day: number) {
    onChange(
      days.includes(day)
        ? days.filter((value) => value !== day)
        : [...days, day].sort((a, b) => a - b)
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAY_OPTIONS.map((day) => {
        const checked = days.includes(day.value);
        return (
          <label
            key={day.value}
            className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
              checked
                ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,#fff8fb_0%,#f8e7ef_100%)] text-[var(--primary-deep)]"
                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--primary-dark)]"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleDay(day.value)}
            />
            <span>{t(day.labelKey)}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setLanguage: applyLanguage, t } = useLanguage();

  const [settings, setSettings] = useState<SettingsPayload>(DEFAULT_SETTINGS);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [activePage, setActivePage] = useState<SettingsPageKey>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingWorkers, setSyncingWorkers] = useState(false);
  const [syncingFollowUp, setSyncingFollowUp] = useState(false);
  const [syncingInventoryAlerts, setSyncingInventoryAlerts] = useState(false);
  const [deletingAlerts, setDeletingAlerts] = useState(false);
  const [importingClients, setImportingClients] = useState(false);
  const [inventoryAlertThreshold, setInventoryAlertThreshold] = useState(25);
  const [clientsImportJobId, setClientsImportJobId] = useState("");
  const [clientsImportStatus, setClientsImportStatus] = useState<ClientsImportStatus | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sidebarPages = [
    {
      key: "general" as const,
      label: t("settings.page_general"),
      description: t("settings.page_general_desc"),
    },
    {
      key: "daily-report" as const,
      label: t("settings.page_daily_report"),
      description: t("settings.page_daily_report_desc"),
    },
    {
      key: "clients" as const,
      label: t("settings.page_clients"),
      description: t("settings.page_clients_desc"),
    },
    {
      key: "inventory" as const,
      label: t("settings.page_inventory"),
      description: t("settings.page_inventory_desc"),
    },
    {
      key: "statistics" as const,
      label: t("settings.page_statistics"),
      description: t("settings.page_statistics_desc"),
    },
    {
      key: "follow-up" as const,
      label: t("settings.page_follow_up"),
      description: t("settings.page_follow_up_desc"),
    },
    {
      key: "rapidone" as const,
      label: t("settings.page_rapidone"),
      description: t("settings.page_rapidone_desc"),
    },
    {
      key: "session" as const,
      label: t("settings.page_session"),
      description: t("settings.page_session_desc"),
    },
  ];

  function updateSettings(patch: Partial<SettingsPayload>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function logout() {
    clearAuth();
    router.push("/login");
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [settingsRes, workersRes] = await Promise.all([
        onlineApi.get<SettingsPayload>("/settings"),
        onlineApi.get<WorkerRow[]>("/workers"),
      ]);
      const inventoryAlertsRes = await onlineApi.get<InventoryLowStockSettings>("/inventory/low-stock-settings");

      const data = settingsRes.data;
      setWorkers(workersRes.data ?? []);
      setInventoryAlertThreshold(Number(inventoryAlertsRes.data?.threshold ?? 25));
      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
        consultant_names: data.consultant_names ?? [],
        lead_agent_names: data.lead_agent_names ?? [],
        daily_report_days: data.daily_report_days ?? DEFAULT_SETTINGS.daily_report_days,
        receipts_check_days: data.receipts_check_days ?? DEFAULT_SETTINGS.receipts_check_days,
        daily_report_schedule_mode:
          data.daily_report_schedule_mode === "single" ? "single" : "range",
        language: (data.language as "en" | "he") || "en",
      });
      applyLanguage((data.language as "en" | "he") || "en");
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.load_failed")));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedJobId = localStorage.getItem(CLIENT_IMPORT_JOB_KEY);
    if (!savedJobId) return;
    setClientsImportJobId(savedJobId);
    setImportingClients(true);
  }, []);

  function toggleName(key: "consultant_names" | "lead_agent_names", name: string, checked: boolean) {
    setSettings((prev) => {
      const values = new Set(prev[key]);
      if (checked) values.add(name);
      else values.delete(name);
      return { ...prev, [key]: [...values] };
    });
  }

  const sortedForConsultants = useMemo(() => {
    const selected = workers.filter((w) => settings.consultant_names.includes(w.worker_name));
    const unselected = workers.filter((w) => !settings.consultant_names.includes(w.worker_name));
    return [...selected, ...unselected];
  }, [workers, settings.consultant_names]);

  const sortedForLeads = useMemo(() => {
    const selected = workers.filter((w) => settings.lead_agent_names.includes(w.worker_name));
    const unselected = workers.filter((w) => !settings.lead_agent_names.includes(w.worker_name));
    return [...selected, ...unselected];
  }, [workers, settings.lead_agent_names]);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: SettingsPayload = {
        ...settings,
        stats_cache_minutes: Number(settings.stats_cache_minutes || 60),
        follow_up_inactive_days: Number(settings.follow_up_inactive_days || 90),
        daily_report_single_hour: Number(settings.daily_report_single_hour || 0),
        daily_report_range_start_hour: Number(settings.daily_report_range_start_hour || 0),
        daily_report_range_end_hour: Number(settings.daily_report_range_end_hour || 0),
        daily_report_interval_hours: Number(settings.daily_report_interval_hours || 1),
      };

      await onlineApi.post("/settings", payload);
      setSuccess(t("settings.saved"));
      applyLanguage(settings.language);
      await loadSettings();
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.save_failed")));
    } finally {
      setSaving(false);
    }
  }

  async function syncWorkersFromRapidOne() {
    try {
      setSyncingWorkers(true);
      setError("");
      setSuccess("");

      await localApi.post("/workers-local/sync-from-rapidone");
      await loadSettings();
      setSuccess(t("settings.workers_synced"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.sync_workers_failed")));
    } finally {
      setSyncingWorkers(false);
    }
  }

  async function syncFollowUpHistory() {
    try {
      setSyncingFollowUp(true);
      setError("");
      setSuccess("");

      await localApi.post("/follow-up-local/sync-history", null, {
        params: { days: settings.follow_up_inactive_days },
      });

      setSuccess(t("settings.follow_up_sync_started"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.sync_follow_up_failed")));
    } finally {
      setSyncingFollowUp(false);
    }
  }

  async function syncInventoryAlerts() {
    try {
      setSyncingInventoryAlerts(true);
      setError("");
      setSuccess("");

      const res = await onlineApi.post<{
        ok: boolean;
        threshold: number;
        tracked_products: number;
        alerts_sent: number;
      }>("/inventory/low-stock-sync", null, {
        params: { threshold: Number(inventoryAlertThreshold || 0) },
      });

      setInventoryAlertThreshold(Number(res.data?.threshold ?? inventoryAlertThreshold));
      setSuccess(
        t("settings.inventory_alert_sync_success")
          .replace("{threshold}", String(res.data?.threshold ?? inventoryAlertThreshold))
          .replace("{count}", String(res.data?.alerts_sent ?? 0))
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.inventory_alert_sync_failed")));
    } finally {
      setSyncingInventoryAlerts(false);
    }
  }

  async function deleteOldAlerts() {
    try {
      setDeletingAlerts(true);
      setError("");
      setSuccess("");

      const res = await onlineApi.post<{ ok: boolean; deleted: number }>("/alerts/delete-all", null, {
        params: { keep_low_inventory: true },
      });
      setSuccess(
        t("settings.alerts_delete_success").replace("{count}", String(res.data?.deleted ?? 0))
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("settings.alerts_delete_failed")));
    } finally {
      setDeletingAlerts(false);
    }
  }

  async function startClientsImport() {
    try {
      setImportingClients(true);
      setClientsImportStatus(null);
      setClientsImportJobId("");
      setError("");
      setSuccess("");

      const res = await onlineApi.post<{ ok: boolean; job_id: string }>("/clients-import/start");
      const jobId = res.data?.job_id;
      if (!jobId) {
        throw new Error(t("settings.clients_import_no_job_id"));
      }
      setClientsImportJobId(jobId);
      if (typeof window !== "undefined") {
        localStorage.setItem(CLIENT_IMPORT_JOB_KEY, jobId);
      }
    } catch (err: unknown) {
      setImportingClients(false);
      setError(getErrorMessage(err, t("settings.clients_import_start_failed")));
    }
  }

  useEffect(() => {
    if (!clientsImportJobId) return;

    const timer = setInterval(async () => {
      try {
        const res = await onlineApi.get<ClientsImportStatus>("/clients-import/status", {
          params: { job_id: clientsImportJobId },
        });
        const payload = res.data;
        setClientsImportStatus(payload);

        if (payload.status === "done") {
          clearInterval(timer);
          setImportingClients(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem(CLIENT_IMPORT_JOB_KEY);
          }
          setSuccess(
            t("settings.clients_import_finished")
              .replace("{count}", String(payload.result?.count ?? 0))
              .replace("{created}", String(payload.result?.created ?? 0))
              .replace("{updated}", String(payload.result?.updated ?? 0))
              .replace("{skipped}", String(payload.result?.skipped ?? 0))
              .replace("{removed}", String(payload.result?.removed_clients ?? 0))
          );
        }

        if (payload.status === "error") {
          clearInterval(timer);
          setImportingClients(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem(CLIENT_IMPORT_JOB_KEY);
          }
          setError(payload.error || t("settings.clients_import_failed"));
        }
      } catch (err: unknown) {
        clearInterval(timer);
        setImportingClients(false);
        setError(getErrorMessage(err, t("settings.clients_import_status_failed")));
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [clientsImportJobId, t]);

  function renderPage() {
    if (activePage === "general") {
      return (
        <Section
          title={t("settings.general_title")}
          description={t("settings.general_desc")}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
              <input
                type="radio"
                name="language"
                checked={settings.language === "en"}
                onChange={() => updateSettings({ language: "en" })}
              />
              <span>{t("common.english")}</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
              <input
                type="radio"
                name="language"
                checked={settings.language === "he"}
                onChange={() => updateSettings({ language: "he" })}
              />
              <span>{t("common.hebrew")}</span>
            </label>
          </div>
        </Section>
      );
    }

    if (activePage === "daily-report") {
      return (
        <div className="space-y-6">
          <Section
            title={t("settings.daily_scheduler_title")}
            description={t("settings.daily_scheduler_desc")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                <input
                  type="radio"
                  name="daily-schedule-mode"
                  checked={settings.daily_report_schedule_mode === "single"}
                  onChange={() => updateSettings({ daily_report_schedule_mode: "single" })}
                />
                <span>{t("settings.daily_mode_single")}</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                <input
                  type="radio"
                  name="daily-schedule-mode"
                  checked={settings.daily_report_schedule_mode === "range"}
                  onChange={() => updateSettings({ daily_report_schedule_mode: "range" })}
                />
                <span>{t("settings.daily_mode_range")}</span>
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {settings.daily_report_schedule_mode === "single" ? (
                <HourSelect
                  label={t("settings.daily_single_hour")}
                  value={settings.daily_report_single_hour}
                  onChange={(value) => updateSettings({ daily_report_single_hour: value })}
                />
              ) : (
                <>
                  <HourSelect
                    label={t("settings.daily_start_hour")}
                    value={settings.daily_report_range_start_hour}
                    onChange={(value) => updateSettings({ daily_report_range_start_hour: value })}
                  />
                  <HourSelect
                    label={t("settings.daily_end_hour")}
                    value={settings.daily_report_range_end_hour}
                    onChange={(value) => updateSettings({ daily_report_range_end_hour: value })}
                  />
                  <NumberInput
                    label={t("settings.daily_interval_hours")}
                    min={1}
                    value={settings.daily_report_interval_hours}
                    onChange={(value) => updateSettings({ daily_report_interval_hours: value })}
                  />
                </>
              )}
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-[var(--primary-dark)]">
                {t("settings.daily_days")}
              </label>
              <WeekdaySelector
                days={settings.daily_report_days}
                onChange={(days) => updateSettings({ daily_report_days: days })}
                t={t}
              />
            </div>
          </Section>

          <Section
            title={t("settings.receipts_scheduler_title")}
            description={t("settings.receipts_scheduler_desc")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                  {t("settings.receipts_time")}
                </label>
                <input
                  type="time"
                  value={settings.receipts_check_time}
                  onChange={(e) => updateSettings({ receipts_check_time: e.target.value })}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-[var(--primary-dark)]">
                {t("settings.receipts_days")}
              </label>
              <WeekdaySelector
                days={settings.receipts_check_days}
                onChange={(days) => updateSettings({ receipts_check_days: days })}
                t={t}
              />
            </div>
          </Section>
        </div>
      );
    }

    if (activePage === "clients") {
      return (
        <div className="space-y-6">
          <Section
            title={t("settings.clients_title")}
            description={t("settings.clients_desc")}
          >
            <div className="flex flex-wrap gap-3">
              <button
                onClick={startClientsImport}
                disabled={importingClients}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {importingClients ? t("settings.clients_import_running") : t("settings.clients_import_button")}
              </button>
            </div>
          </Section>

          <div className="grid gap-4 md:grid-cols-5">
            <Section title={t("settings.clients_total_found")}><div className="text-2xl font-semibold text-[var(--primary-deep)]">{clientsImportStatus?.total_available ?? 0}</div></Section>
            <Section title={t("settings.clients_scraped_count")}><div className="text-2xl font-semibold text-[var(--primary-deep)]">{clientsImportStatus?.scraped_count ?? 0}</div></Section>
            <Section title={t("settings.clients_current_page")}><div className="text-2xl font-semibold text-[var(--primary-deep)]">{clientsImportStatus?.current_page ?? 0}</div></Section>
            <Section title={t("settings.clients_uploading_page")}><div className="text-2xl font-semibold text-[var(--primary-deep)]">{clientsImportStatus?.uploading_page ?? 0}</div></Section>
            <Section title={t("settings.clients_created_updated_removed")}><div className="text-2xl font-semibold text-[var(--primary-deep)]">{`${clientsImportStatus?.created ?? 0} / ${clientsImportStatus?.updated ?? 0} / ${clientsImportStatus?.result?.removed_clients ?? 0}`}</div></Section>
          </div>

          {(clientsImportJobId || clientsImportStatus) ? (
            <Section
              title={t("settings.clients_import_progress")}
              description={t("settings.clients_import_progress_desc")}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="text-sm text-[var(--muted)]">{clientsImportJobId}</div>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                    clientsImportStatus?.status === "done"
                      ? "bg-emerald-50 text-emerald-700"
                      : clientsImportStatus?.status === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-[var(--card-soft)] text-[var(--primary-dark)]"
                  }`}
                >
                  {clientsImportStatus?.status || "queued"}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                <div className="max-h-80 overflow-y-auto bg-[var(--card-soft)] px-4 py-3">
                  <div className="space-y-2 text-sm text-[var(--foreground)]">
                    {(clientsImportStatus?.progress_lines ?? []).length === 0 ? (
                      <div>{t("settings.clients_no_progress")}</div>
                    ) : (
                      clientsImportStatus?.progress_lines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Section>
          ) : null}
        </div>
      );
    }

    if (activePage === "inventory") {
      return (
        <div className="space-y-6">
          <Section
            title={t("settings.inventory_alerts_title")}
            description={t("settings.inventory_alerts_desc")}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <NumberInput
                label={t("settings.inventory_alert_threshold")}
                min={0}
                value={inventoryAlertThreshold}
                onChange={(value) => setInventoryAlertThreshold(value)}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={syncInventoryAlerts}
                disabled={syncingInventoryAlerts}
                className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {syncingInventoryAlerts ? t("settings.inventory_alert_syncing") : t("settings.inventory_alert_sync")}
              </button>

              <button
                onClick={deleteOldAlerts}
                disabled={deletingAlerts}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
              >
                {deletingAlerts ? t("settings.alerts_deleting") : t("settings.alerts_delete_button")}
              </button>
            </div>
          </Section>
        </div>
      );
    }

    if (activePage === "statistics") {
      return (
        <div className="space-y-6">
          <Section
            title={t("settings.title_staff")}
            description={t("settings.page_statistics_desc")}
            action={
              <button
                onClick={syncWorkersFromRapidOne}
                disabled={syncingWorkers}
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
              >
                {syncingWorkers ? t("settings.syncing") : t("settings.sync_workers")}
              </button>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-3 block text-sm font-medium text-[var(--primary-dark)]">
                  {t("settings.consultant_names")}
                </label>
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-3">
                  {sortedForConsultants.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                      {t("settings.no_workers")}
                    </div>
                  ) : (
                    sortedForConsultants.map((worker) => (
                      <WorkerToggle
                        key={`consultant-${worker.id}`}
                        label={worker.worker_name}
                        checked={settings.consultant_names.includes(worker.worker_name)}
                        onChange={(checked) =>
                          toggleName("consultant_names", worker.worker_name, checked)
                        }
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-[var(--primary-dark)]">
                  {t("settings.lead_agent_names")}
                </label>
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-3">
                  {sortedForLeads.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                      {t("settings.no_workers")}
                    </div>
                  ) : (
                    sortedForLeads.map((worker) => (
                      <WorkerToggle
                        key={`lead-${worker.id}`}
                        label={worker.worker_name}
                        checked={settings.lead_agent_names.includes(worker.worker_name)}
                        onChange={(checked) =>
                          toggleName("lead_agent_names", worker.worker_name, checked)
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            title={t("settings.statistics_behavior_title")}
            description={t("settings.statistics_behavior_desc")}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <NumberInput
                label={t("settings.cache_minutes")}
                min={1}
                value={settings.stats_cache_minutes}
                onChange={(value) => updateSettings({ stats_cache_minutes: value })}
              />

              <div className="flex items-end">
                <label className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                  <input
                    type="checkbox"
                    checked={settings.save_closed_month_stats_to_db}
                    onChange={(e) =>
                      updateSettings({ save_closed_month_stats_to_db: e.target.checked })
                    }
                  />
                  {t("settings.save_closed_months")}
                </label>
              </div>
            </div>
          </Section>
        </div>
      );
    }

    if (activePage === "follow-up") {
      return (
        <Section
          title={t("settings.follow_up_title")}
          description={t("settings.follow_up_desc")}
          action={
            <button
              onClick={syncFollowUpHistory}
              disabled={syncingFollowUp}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
            >
              {syncingFollowUp ? t("settings.syncing") : t("settings.sync")}
            </button>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <NumberInput
              label={t("settings.follow_up_days")}
              min={1}
              value={settings.follow_up_inactive_days}
              onChange={(value) => updateSettings({ follow_up_inactive_days: value })}
            />
          </div>
        </Section>
      );
    }

    if (activePage === "rapidone") {
      return (
        <Section
          title={t("settings.title_connection")}
          description={t("settings.rapidone_desc")}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextInput
              label={t("settings.rapidone_base_url")}
              value={settings.rapidone_base_url}
              onChange={(value) => updateSettings({ rapidone_base_url: value })}
            />
            <TextInput
              label={t("settings.rapidone_username")}
              value={settings.rapidone_username}
              onChange={(value) => updateSettings({ rapidone_username: value })}
            />
            <TextInput
              label={t("settings.rapidone_password")}
              type="password"
              value={settings.rapidone_password}
              onChange={(value) => updateSettings({ rapidone_password: value })}
            />
            <TextInput
              label={t("settings.rapidone_db_name")}
              value={settings.rapidone_db_name}
              onChange={(value) => updateSettings({ rapidone_db_name: value })}
            />
          </div>
        </Section>
      );
    }

    return (
      <Section
        title={t("settings.title_session")}
        description={t("settings.session_desc")}
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadSettings}
            disabled={saving || loading}
            className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
          >
            {loading ? t("settings.loading") : t("settings.reload")}
          </button>

          <button
            onClick={logout}
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            {t("settings.logout")}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <PageShell title={t("nav.settings")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-[var(--border)] bg-white/84 p-4 shadow-[var(--shadow-card)]">
            <div className="mb-4 px-2">
              <h2 className="text-lg font-semibold text-[var(--primary-deep)]">
                {t("settings.sidebar_title")}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t("settings.sidebar_description")}
              </p>
            </div>

            <div className="space-y-3">
              {sidebarPages.map((page) => (
                <SidebarButton
                  key={page.key}
                  label={page.label}
                  description={page.description}
                  active={activePage === page.key}
                  onClick={() => setActivePage(page.key)}
                />
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            {renderPage()}

            <Section
              title={t("settings.save_section_title")}
              description={t("settings.save_section_desc")}
            >
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveSettings}
                  disabled={saving || loading}
                  className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {saving ? t("settings.saving") : t("settings.save_settings")}
                </button>

                <button
                  onClick={loadSettings}
                  disabled={saving || loading}
                  className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
                >
                  {loading ? t("settings.loading") : t("settings.reload")}
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
