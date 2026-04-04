"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { onlineApi } from "@/lib/api-online";
import { localApi } from "@/lib/api-local";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = [
  "#f9a8d4",
  "#f472b6",
  "#fb7185",
  "#fda4af",
  "#fbcfe8",
  "#fecdd3",
  "#fda4af",
  "#f9a8d4",
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

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-rose-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-rose-950">{value}</p>
    </div>
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
        } catch {
          // fallback to local below
        }
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-rose-950">Filters</h3>
              <p className="text-sm text-rose-500">
                Choose a month, then press refresh.
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-rose-800">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
                />
              </div>

              <button
                onClick={refreshAll}
                disabled={loading}
                className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total Units Sold" value={totalQty} />
          <SummaryCard title="Top Category" value={topCategory} />
          <SummaryCard title="Top Product In Selected Category" value={topProduct} />
          <SummaryCard title="Month Type" value={data?.is_final ? "Closed / Cached" : "Open / Live"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">Categories Breakdown</h3>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-10 text-center text-sm text-rose-500">
                Loading chart...
              </div>
            ) : pieData.length === 0 ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-10 text-center text-sm text-rose-500">
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
          </section>

          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-rose-950">Categories Table</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-rose-100">
              <table className="min-w-full divide-y divide-rose-100">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-rose-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50 bg-white">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-rose-500">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((row) => (
                      <tr
                        key={row.category_name}
                        className={row.category_name === selectedCategory ? "bg-rose-50" : "hover:bg-rose-50/40"}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-rose-900">{row.category_name}</td>
                        <td className="px-4 py-4 text-sm text-rose-700">{row.qty}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedCategory(row.category_name)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
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
          </section>
        </div>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-rose-950">Products In Category</h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-rose-100">
            <table className="min-w-full divide-y divide-rose-100">
              <thead className="bg-rose-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-rose-700">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 bg-white">
                {!selectedCategoryData || selectedCategoryData.items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-rose-500">
                      No products found for this category.
                    </td>
                  </tr>
                ) : (
                  selectedCategoryData.items.map((row) => (
                    <tr key={`${row.item_code}-${row.item_name}`} className="hover:bg-rose-50/40">
                      <td className="px-4 py-4 text-sm font-medium text-rose-900">{row.item_code || "-"}</td>
                      <td className="px-4 py-4 text-sm text-rose-800">{row.item_name}</td>
                      <td className="px-4 py-4 text-sm text-rose-700">{row.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}