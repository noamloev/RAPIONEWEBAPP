export type LocalAlert = {
  id: string;
  level: "info" | "warn" | "error" | "success";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

const STORAGE_KEY = "rapidone_local_alerts";

function readAlerts(): LocalAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: LocalAlert[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new Event("rapidone-alerts-changed"));
}

export function getLocalAlerts(): LocalAlert[] {
  return readAlerts().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addLocalAlert(
  alert: Omit<LocalAlert, "id" | "created_at" | "is_read">
) {
  const alerts = readAlerts();
  alerts.unshift({
    ...alert,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    is_read: false,
  });
  writeAlerts(alerts.slice(0, 100));
}

export function markLocalAlertRead(id: string) {
  const alerts = readAlerts().map((a) =>
    a.id === id ? { ...a, is_read: true } : a
  );
  writeAlerts(alerts);
}

export function clearLocalAlerts() {
  writeAlerts([]);
}