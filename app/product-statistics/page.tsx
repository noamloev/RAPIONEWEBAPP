"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = [
  "#6f314d",
  "#92506c",
  "#b56a87",
  "#c98aa1",
  "#dbc0cd",
  "#ead8e0",
  "#a85f7b",
  "#7f415d",
];

type MonthlyStatsResponse = {
  year: number;
  month: number;
  is_final?: boolean;
  total_qty: number;
  categories: {
    category_name: string;
    qty: number;
    items: {
      item_code: string;
      item_name: string;
      qty: number;
    }[];
  }[];
};

type OnlineMonthlyCacheResponse =
  | ({ found: false })
  | ({
      found: true;
      year: number;
      month: number;
      is_final?: boolean;
      total_qty: number;
      categories: {
        category_name: string;
        qty: number;
        items: {
          item_code: string;
          item_name: string;
          qty: number;
        }[];
      }[];
    });

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/88 p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-[var(--border)] bg-white/88 p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--primary-deep)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ProductStatisticsPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<MonthlyStatsResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshAll() {
    try {
      setLoading(true);
      setError("");

      const [yearStr, monStr] = month.split("-");
      const year = Number(yearStr);
      const mon = Number(monStr);

      const now = new Date();
      const isClosedMonth =
        year < now.getFullYear() ||
        (year === now.getFullYear() && mon < now.getMonth() + 1);

      let payload: MonthlyStatsResponse | null = null;

      if (isClosedMonth) {
        try {
          const cacheRes = await onlineApi.get<OnlineMonthlyCacheResponse>("/stats/monthly-cache", {
            params: { year, month: mon },
          });

          if ("found" in cacheRes.data && cacheRes.data.found) {
            payload = {
              year: cacheRes.data.year,
              month: cacheRes.data.month,
              is_final: cacheRes.data.is_final,
              total_qty: cacheRes.data.total_qty,
              categories: cacheRes.data.categories,
            };
          }
        } catch {}
      }

      if (!payload) {
        const res = await localApi.get<MonthlyStatsResponse>("/stats/monthly", {
          params: { year, month: mon },
        });
        payload = res.data;
      }

      setData(payload);
      const firstCategory = payload?.categories?.[0]?.category_name || "";
      setSelectedCategory(firstCategory);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : err?.message || "Failed to load product statistics");
    } finally {
      setLoading(false);
    }
  }

  const categories = data?.categories ?? [];

  const selectedCategoryData = useMemo(() => {
    return categories.find((c) => c.category_name === selectedCategory) || null;
  }, [categories, selectedCategory]);

  const totalQty = data?.total_qty ?? 0;

  const topCategory = useMemo(() => {
    if (categories.length === 0) return "-";
    return categories[0]?.category_name || "-";
  }, [categories]);

  const topProduct = useMemo(() => {
    const items = selectedCategoryData?.items ?? [];
    if (items.length === 0) return "-";
    return [...items].sort((a, b) => b.qty - a.qty)[0]?.item_name || "-";
  }, [selectedCategoryData]);

  const pieData = useMemo(() => {
    return categories.map((row) => ({
      name: row.category_name,
      value: Number(row.qty || 0),
    }));
  }, [categories]);

  return (
    <PageShell title="Product Statistics">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <Section title="Filters">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Choose a month, then press refresh.
            </p>

            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--primary-dark)]">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--border-strong)] focus:bg-white"
                />
              </div>

              <button
                onClick={refreshAll}
                disabled={loading}
                className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total Units Sold" value={totalQty} />
          <SummaryCard title="Top Category" value={topCategory} />
          <SummaryCard title="Top Product In Selected Category" value={topProduct} />
          <SummaryCard title="Month Type" value={data?.is_final ? "Closed / Cached" : "Open / Live"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Categories Breakdown">
            {loading ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                Loading chart...
              </div>
            ) : pieData.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                No category data.
              </div>
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={120}
                      innerRadius={55}
                      onClick={(data) => {
                        if (data?.name) setSelectedCategory(String(data.name));
                      }}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          <Section title="Categories Table">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--card-soft)]">
                  <tr>
                    {["Category", "Qty", "Action"].map((col) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)] ${col === "Action" ? "text-right" : "text-left"}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-white">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((row) => (
                      <tr
                        key={row.category_name}
                        className={row.category_name === selectedCategory ? "bg-[var(--card-soft)]" : "hover:bg-[var(--card-soft)]"}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">{row.category_name}</td>
                        <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.qty}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedCategory(row.category_name)}
                            className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--primary-dark)] transition hover:bg-[var(--card-soft)]"
                          >
                            View Products
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section title="Products In Category">
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--card-soft)]">
                <tr>
                  {["Code", "Product", "Qty"].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--primary-dark)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {!selectedCategoryData || selectedCategoryData.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      No products found for this category.
                    </td>
                  </tr>
                ) : (
                  selectedCategoryData.items.map((row) => (
                    <tr key={`${row.item_code}-${row.item_name}`} className="hover:bg-[var(--card-soft)]">
                      <td className="px-4 py-4 text-sm font-medium text-[var(--primary-deep)]">{row.item_code || "-"}</td>
                      <td className="px-4 py-4 text-sm text-[var(--foreground)]">{row.item_name}</td>
                      <td className="px-4 py-4 text-sm text-[var(--muted-strong)]">{row.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </PageShell>
  );
}