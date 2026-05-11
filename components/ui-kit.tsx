import React from "react";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-[var(--primary-dark)]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--primary-dark)]">
        {value}
      </p>
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-fuchsia-100 ${props.className ?? ""}`}
    />
  );
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-fuchsia-100 ${props.className ?? ""}`}
    />
  );
}

export function TextAreaInput(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4 text-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-fuchsia-100 ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-[var(--primary-strong)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(192,38,211,0.22)] transition hover:bg-[var(--primary-dark)] hover:shadow-[0_16px_30px_rgba(192,38,211,0.28)] focus:outline-none focus:ring-4 focus:ring-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`rounded-2xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--primary-dark)] shadow-sm transition hover:bg-[var(--card-soft)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--card-soft)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-white">
          {children}
        </tbody>
      </table>
    </div>
  );
}
