"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";

type SettingsPayload = {
  consultant_names: string[];
  lead_agent_names: string[];
  stats_cache_minutes: number;
  save_closed_month_stats_to_db: boolean;
};

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toTextareaValue(items: string[]): string {
  return (items ?? []).join("\n");
}

export default function SettingsPage() {
  const router = useRouter();

  const [consultantsText, setConsultantsText] = useState("");
  const [leadsText, setLeadsText] = useState("");
  const [statsCacheMinutes, setStatsCacheMinutes] = useState(60);
  const [saveClosedMonths, setSaveClosedMonths] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      const res = await onlineApi.get<SettingsPayload>("/settings");
      const data = res.data;

      setConsultantsText(toTextareaValue(data.consultant_names ?? []));
      setLeadsText(toTextareaValue(data.lead_agent_names ?? []));
      setStatsCacheMinutes(Number(data.stats_cache_minutes ?? 60));
      setSaveClosedMonths(Boolean(data.save_closed_month_stats_to_db ?? true));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: SettingsPayload = {
        consultant_names: parseLines(consultantsText),
        lead_agent_names: parseLines(leadsText),
        stats_cache_minutes: Number(statsCacheMinutes || 60),
        save_closed_month_stats_to_db: saveClosedMonths,
      };

      await onlineApi.post("/settings", payload);
      setSuccess("Settings saved.");
      await loadSettings();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Settings">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-rose-950">Statistics Staff</h2>
            <p className="mt-1 text-sm text-rose-500">
              Choose which names the local scraping should use for consultants and leads.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-rose-800">
                Consultant Names
              </label>
              <textarea
                value={consultantsText}
                onChange={(e) => setConsultantsText(e.target.value)}
                rows={12}
                placeholder={"אדית רוסו\nורדית\nחן גבלן"}
                className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 outline-none transition focus:border-rose-400 focus:bg-white"
              />
              <p className="mt-2 text-xs text-rose-500">
                One consultant name per line.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-rose-800">
                Lead Agent Names
              </label>
              <textarea
                value={leadsText}
                onChange={(e) => setLeadsText(e.target.value)}
                rows={12}
                placeholder={"עדן אמבר\nמוריאל ברכה\nשרית"}
                className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 outline-none transition focus:border-rose-400 focus:bg-white"
              />
              <p className="mt-2 text-xs text-rose-500">
                One lead agent name per line.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-rose-950">Cache Settings</h2>
            <p className="mt-1 text-sm text-rose-500">
              Control how long local statistics stay cached and whether closed months are saved online.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-rose-800">
                Local Cache Minutes
              </label>
              <input
                type="number"
                min={1}
                value={statsCacheMinutes}
                onChange={(e) => setStatsCacheMinutes(Number(e.target.value))}
                className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 outline-none transition focus:border-rose-400 focus:bg-white"
              />
              <p className="mt-2 text-xs text-rose-500">
                Example: 60 means one hour local cache.
              </p>
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <input
                  type="checkbox"
                  checked={saveClosedMonths}
                  onChange={(e) => setSaveClosedMonths(e.target.checked)}
                  className="h-4 w-4"
                />
                Save closed month statistics to the online DB
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-rose-950">Session</h2>
            <p className="mt-1 text-sm text-rose-500">
              Save your changes or end the current session.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveSettings}
              disabled={saving || loading}
              className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <button
              onClick={loadSettings}
              disabled={saving || loading}
              className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Reload"}
            </button>

            <button
              onClick={logout}
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}