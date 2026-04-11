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
  language: "en" | "he";
};

type WorkerRow = {
  id: number;
  worker_name: string;
  worker_type: string;
  source: string;
};

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

export default function SettingsPage() {
  const router = useRouter();
  const { setLanguage: applyLanguage, t } = useLanguage();

  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [consultantNames, setConsultantNames] = useState<string[]>([]);
  const [leadAgentNames, setLeadAgentNames] = useState<string[]>([]);
  const [statsCacheMinutes, setStatsCacheMinutes] = useState(60);
  const [saveClosedMonths, setSaveClosedMonths] = useState(true);
  const [followUpInactiveDays, setFollowUpInactiveDays] = useState(90);
  const [language, setLanguage] = useState<"en" | "he">("en");

  const [rapidoneBaseUrl, setRapidoneBaseUrl] = useState("https://anuchka.rapid-image.net");
  const [rapidoneUsername, setRapidoneUsername] = useState("");
  const [rapidonePassword, setRapidonePassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingWorkers, setSyncingWorkers] = useState(false);
  const [syncingFollowUp, setSyncingFollowUp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      const data = settingsRes.data;
      setWorkers(workersRes.data ?? []);

      setConsultantNames(data.consultant_names ?? []);
      setLeadAgentNames(data.lead_agent_names ?? []);
      setStatsCacheMinutes(Number(data.stats_cache_minutes ?? 60));
      setSaveClosedMonths(Boolean(data.save_closed_month_stats_to_db ?? true));
      setFollowUpInactiveDays(Number(data.follow_up_inactive_days ?? 90));
      setRapidoneBaseUrl(data.rapidone_base_url || "https://anuchka.rapid-image.net");
      setRapidoneUsername(data.rapidone_username || "");
      setRapidonePassword(data.rapidone_password || "");
      setLanguage((data.language as "en" | "he") || "en");
      applyLanguage((data.language as "en" | "he") || "en");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleName(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    name: string,
    checked: boolean
  ) {
    setter((prev) => {
      const set = new Set(prev);
      if (checked) set.add(name);
      else set.delete(name);
      return [...set];
    });
  }

  const sortedForConsultants = useMemo(() => {
    const selected = workers.filter((w) => consultantNames.includes(w.worker_name));
    const unselected = workers.filter((w) => !consultantNames.includes(w.worker_name));
    return [...selected, ...unselected];
  }, [workers, consultantNames]);

  const sortedForLeads = useMemo(() => {
    const selected = workers.filter((w) => leadAgentNames.includes(w.worker_name));
    const unselected = workers.filter((w) => !leadAgentNames.includes(w.worker_name));
    return [...selected, ...unselected];
  }, [workers, leadAgentNames]);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: SettingsPayload = {
        consultant_names: consultantNames,
        lead_agent_names: leadAgentNames,
        stats_cache_minutes: Number(statsCacheMinutes || 60),
        save_closed_month_stats_to_db: saveClosedMonths,
        follow_up_inactive_days: Number(followUpInactiveDays || 90),
        rapidone_base_url: rapidoneBaseUrl,
        rapidone_username: rapidoneUsername,
        rapidone_password: rapidonePassword,
        language,
      };

      await onlineApi.post("/settings", payload);
      setSuccess("Settings saved.");
      applyLanguage(language);
      await loadSettings();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to save settings");
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

      setSuccess("Workers synced from RapidOne.");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to sync workers");
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
        params: { days: followUpInactiveDays },
      });

      setSuccess("Follow-up history sync started.");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to sync follow-up history");
    } finally {
      setSyncingFollowUp(false);
    }
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

        <Section
          title={t("settings.title_staff")}
          description="Sync worker names from RapidOne and choose them using a scrollable multi-select list."
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
                Consultant Names
              </label>
              <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-3">
                {sortedForConsultants.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                    No workers found yet.
                  </div>
                ) : (
                  sortedForConsultants.map((worker) => (
                    <WorkerToggle
                      key={`consultant-${worker.id}`}
                      label={worker.worker_name}
                      checked={consultantNames.includes(worker.worker_name)}
                      onChange={(checked) =>
                        toggleName(setConsultantNames, worker.worker_name, checked)
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-[var(--primary-dark)]">
                Lead Agent Names
              </label>
              <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-3">
                {sortedForLeads.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--muted-strong)]">
                    No workers found yet.
                  </div>
                ) : (
                  sortedForLeads.map((worker) => (
                    <WorkerToggle
                      key={`lead-${worker.id}`}
                      label={worker.worker_name}
                      checked={leadAgentNames.includes(worker.worker_name)}
                      onChange={(checked) =>
                        toggleName(setLeadAgentNames, worker.worker_name, checked)
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title={t("settings.title_language")}
          description={t("settings.language_description")}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
              <input
                type="radio"
                name="language"
                checked={language === "en"}
                onChange={() => setLanguage("en")}
              />
              <span>{t("common.english")}</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
              <input
                type="radio"
                name="language"
                checked={language === "he"}
                onChange={() => setLanguage("he")}
              />
              <span>{t("common.hebrew")}</span>
            </label>
          </div>
        </Section>

        <Section title={t("settings.title_connection")}>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                RapidOne Base URL
              </label>
              <input
                type="text"
                value={rapidoneBaseUrl}
                onChange={(e) => setRapidoneBaseUrl(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                RapidOne Username
              </label>
              <input
                type="text"
                value={rapidoneUsername}
                onChange={(e) => setRapidoneUsername(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                RapidOne Password
              </label>
              <input
                type="password"
                value={rapidonePassword}
                onChange={(e) => setRapidonePassword(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />
            </div>
          </div>
        </Section>

        <Section title={t("settings.title_cache")}>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                Local Cache Minutes
              </label>
              <input
                type="number"
                min={1}
                value={statsCacheMinutes}
                onChange={(e) => setStatsCacheMinutes(Number(e.target.value))}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                Inactive Client Threshold (days)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={followUpInactiveDays}
                  onChange={(e) => setFollowUpInactiveDays(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                />
                <button
                  onClick={syncFollowUpHistory}
                  disabled={syncingFollowUp}
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
                >
                  {syncingFollowUp ? t("settings.syncing") : t("settings.sync")}
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm text-[var(--primary-dark)]">
                <input
                  type="checkbox"
                  checked={saveClosedMonths}
                  onChange={(e) => setSaveClosedMonths(e.target.checked)}
                />
                Save closed month statistics to the online DB
              </label>
            </div>
          </div>
        </Section>

        <Section title={t("settings.title_session")}>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveSettings}
              disabled={saving || loading}
              className="rounded-2xl bg-[linear-gradient(135deg,#b55a80_0%,#8f4766_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(159,79,114,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? "Saving..." : t("settings.save_settings")}
            </button>

            <button
              onClick={loadSettings}
              disabled={saving || loading}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:opacity-60"
            >
              {loading ? "Loading..." : t("settings.reload")}
            </button>

            <button
              onClick={logout}
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              {t("settings.logout")}
            </button>
          </div>
        </Section>
      </div>
    </PageShell>
  );
}