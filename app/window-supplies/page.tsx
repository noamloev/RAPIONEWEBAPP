"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import {
  PrimaryButton,
  SectionCard,
  SecondaryButton,
  SummaryCard,
  TextAreaInput,
  TextInput,
} from "@/components/ui-kit";
import { useLanguage } from "@/components/language-provider";
import { onlineApi } from "@/lib/api-online";
import { getUser } from "@/lib/auth";
import { WindowSupplyDocument, WindowSupplyDraft } from "@/lib/types";

type PendingDocument = {
  localId: string;
  document_name: string;
  original_file_name: string;
  content_type: string;
  file_size: number;
  data_base64: string;
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function formatDate(value: string, locale: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale);
}

function makeDocumentUrl(document: { content_type: string; data_base64: string }) {
  return `data:${document.content_type};base64,${document.data_base64}`;
}

function getDocumentExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

function renderDocumentPreview(document: WindowSupplyDocument, url: string) {
  if (document.content_type.startsWith("image/")) {
    return (
      <img
        src={url}
        alt={document.document_name}
        className="mb-4 h-48 w-full rounded-2xl object-cover"
      />
    );
  }

  if (document.content_type === "application/pdf") {
    return (
      <iframe
        src={url}
        title={document.document_name}
        className="mb-4 h-48 w-full rounded-2xl border border-[var(--border)] bg-white"
      />
    );
  }

  return (
    <div className="mb-4 flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 text-center">
      <div className="text-sm font-semibold text-[var(--primary-dark)]">
        {getDocumentExtension(document.original_file_name) || "FILE"}
      </div>
      <div className="mt-2 text-xs text-[var(--muted)]">{document.content_type}</div>
    </div>
  );
}

export default function WindowSuppliesPage() {
  const { t, language } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [drafts, setDrafts] = useState<WindowSupplyDraft[]>([]);
  const [windowName, setWindowName] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<PendingDocument[]>([]);

  const locale = language === "he" ? "he-IL" : "en-US";
  const totalDocuments = useMemo(
    () => drafts.reduce((sum, draft) => sum + draft.document_count, 0),
    [drafts]
  );
  const latestUpdate = drafts[0]?.updated_at ? formatDate(drafts[0].updated_at, locale) : "-";

  async function loadDrafts() {
    const response = await onlineApi.get<WindowSupplyDraft[]>("/window-supplies/drafts");
    setDrafts(response.data ?? []);
  }

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");
      await loadDrafts();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        t("pages.window_supplies.load_failed");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(event.target.files ?? []);
    if (fileList.length === 0) return;

    setError("");
    setSuccess("");

    const nextDocs = await Promise.all(
      fileList.map(async (file, index) => ({
        localId: `${file.name}-${file.size}-${Date.now()}-${index}`,
        document_name: file.name.replace(/\.[^.]+$/, "") || `Document ${documents.length + index + 1}`,
        original_file_name: file.name,
        content_type: file.type || "application/octet-stream",
        file_size: file.size,
        data_base64: await toBase64(file),
      }))
    );

    setDocuments((current) => [...current, ...nextDocs]);
    event.target.value = "";
  }

  function updateDocumentName(localId: string, value: string) {
    setDocuments((current) =>
      current.map((document) =>
        document.localId === localId ? { ...document, document_name: value } : document
      )
    );
  }

  function removeDocument(localId: string) {
    setDocuments((current) => current.filter((document) => document.localId !== localId));
  }

  async function saveDraft() {
    if (!windowName.trim()) {
      setError(t("pages.window_supplies.window_name_required"));
      return;
    }
    if (documents.length === 0) {
      setError(t("pages.window_supplies.files_required"));
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const user = getUser();
      await onlineApi.post("/window-supplies/drafts", {
        window_name: windowName.trim(),
        notes: notes.trim(),
        created_by: user?.full_name || user?.username || "",
        documents: documents.map(({ localId: _localId, ...document }) => document),
      });

      setWindowName("");
      setNotes("");
      setDocuments([]);
      setSuccess(t("pages.window_supplies.saved"));
      await loadDrafts();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        t("pages.window_supplies.save_failed");
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSavedDocument(draftId: number, documentId: number) {
    try {
      setDeletingDocumentId(documentId);
      setError("");
      setSuccess("");

      const response = await onlineApi.delete<WindowSupplyDraft>(
        `/window-supplies/drafts/${draftId}/documents/${documentId}`
      );
      const updatedDraft = response.data;

      setDrafts((current) =>
        current.map((draft) => (draft.id === draftId && updatedDraft ? updatedDraft : draft))
      );
      setSuccess(t("pages.window_supplies.document_deleted"));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        t("pages.window_supplies.delete_failed");
      setError(message);
    } finally {
      setDeletingDocumentId(null);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      setIsMobile(mediaQuery.matches);
      setDeviceReady(true);
    };
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  return (
    <PageShell title={t("pages.window_supplies.title")}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {!isMobile && deviceReady ? (
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title={t("pages.window_supplies.total_drafts")} value={drafts.length} />
            <SummaryCard title={t("pages.window_supplies.total_documents")} value={totalDocuments} />
            <SummaryCard title={t("pages.window_supplies.latest_update")} value={latestUpdate} />
          </div>
        ) : null}

        {isMobile && deviceReady ? (
          <SectionCard
            title={t("pages.window_supplies.mobile_title")}
            description={`${t("pages.window_supplies.mobile_desc")} ${t("pages.window_supplies.mobile_only_note")}`}
          >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                  {t("pages.window_supplies.window_name")}
                </label>
                <TextInput
                  value={windowName}
                  onChange={(event) => setWindowName(event.target.value)}
                  placeholder={t("pages.window_supplies.window_name")}
                />
              </div>

              <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card-soft)] p-4">
                <div className="mb-3 text-sm font-medium text-[var(--primary-dark)]">
                  {isMobile
                    ? t("pages.window_supplies.mobile_detected")
                    : t("pages.window_supplies.desktop_detected")}
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  multiple
                  onChange={handleFilesSelected}
                  className="block w-full text-sm text-[var(--muted-strong)] file:mr-4 file:rounded-2xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-[var(--primary-dark)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--primary-dark)]">
                {t("pages.window_supplies.notes")}
              </label>
              <TextAreaInput
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder={t("pages.window_supplies.notes")}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {t("pages.window_supplies.documents")}
                </h3>
                <span className="text-sm text-[var(--muted)]">{documents.length}</span>
              </div>

              {documents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
                  {t("pages.window_supplies.no_documents")}
                </div>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.localId}
                    className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="space-y-2">
                      <TextInput
                        value={document.document_name}
                        onChange={(event) =>
                          updateDocumentName(document.localId, event.target.value)
                        }
                        placeholder={t("pages.window_supplies.document_name")}
                      />
                      <div className="text-xs text-[var(--muted)]">
                        {document.original_file_name} | {(document.file_size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <div className="flex items-start justify-end">
                      <SecondaryButton onClick={() => removeDocument(document.localId)}>
                        {t("pages.window_supplies.remove_file")}
                      </SecondaryButton>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={saveDraft} disabled={saving}>
                {saving
                  ? t("pages.window_supplies.saving_draft")
                  : t("pages.window_supplies.save_draft")}
              </PrimaryButton>
              <SecondaryButton onClick={refreshAll} disabled={loading || saving}>
                {t("common.refresh")}
              </SecondaryButton>
            </div>
          </div>
          </SectionCard>
        ) : null}

        {!isMobile && deviceReady ? (
          <SectionCard
            title={t("pages.window_supplies.desktop_title")}
            description={t("pages.window_supplies.desktop_desc")}
          >
            {drafts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
                {loading ? t("common.loading") : t("pages.window_supplies.empty")}
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <article
                    key={draft.id}
                    className="rounded-[30px] border border-[var(--border)] bg-white p-5 shadow-[0_10px_24px_rgba(110,61,82,0.04)]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--primary-dark)]">
                          {draft.window_name}
                        </h3>
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          {t("pages.window_supplies.created_by")}: {draft.created_by || "-"}
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {t("pages.window_supplies.updated_at")}: {formatDate(draft.updated_at, locale)}
                        </div>
                        {draft.notes ? (
                          <p className="mt-3 max-w-3xl text-sm text-[var(--foreground)]">
                            {draft.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl bg-[var(--card-soft)] px-4 py-3 text-sm font-medium text-[var(--primary-dark)]">
                        {draft.document_count} {t("pages.window_supplies.documents")}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {draft.documents.map((document) => {
                        const url = makeDocumentUrl(document);

                        return (
                          <div
                            key={document.id}
                            className="rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
                          >
                            <div className="mb-3 text-sm font-semibold text-[var(--primary-dark)]">
                              {document.document_name}
                            </div>
                            <div className="mb-3 text-xs text-[var(--muted)]">
                              {document.original_file_name}
                            </div>
                            {renderDocumentPreview(document, url)}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[var(--primary-dark)] shadow-sm"
                            >
                              {t("pages.window_supplies.open_document")}
                            </a>
                            <div className="mt-3">
                              <SecondaryButton
                                onClick={() => deleteSavedDocument(draft.id, document.id)}
                                disabled={deletingDocumentId === document.id}
                              >
                                {deletingDocumentId === document.id
                                  ? t("pages.window_supplies.deleting_document")
                                  : t("pages.window_supplies.delete_document")}
                              </SecondaryButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>
    </PageShell>
  );
}
