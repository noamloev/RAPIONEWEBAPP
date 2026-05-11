"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Boxes,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  Package,
  PersonStandingIcon,
  PhoneIcon,
  PieChart,
  Settings,
  Users,
  Building2,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export const navigationItems = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "nav.clients", icon: PersonStandingIcon },
  { href: "/products", labelKey: "nav.products", icon: Package },
  { href: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { href: "/transfers", labelKey: "nav.transfers", icon: ArrowLeftRight },
  { href: "/daily-report", labelKey: "nav.daily_report", icon: FileBarChart2 },
  { href: "/follow-up", labelKey: "nav.follow_up", icon: PhoneIcon },
  { href: "/window-supplies", labelKey: "nav.window_supplies", icon: FileText },
  { href: "/product-statistics", labelKey: "nav.product_statistics", icon: PieChart },
  { href: "/worker-statistics", labelKey: "nav.worker_statistics", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <>
      <aside className="hidden w-[292px] shrink-0 border-r border-[var(--border)] bg-slate-950 text-white lg:block">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[var(--shadow-card)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-[0_14px_30px_rgba(37,99,235,0.34)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
              Company Control
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              RapidOne
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Inventory, reports, clients, and operational checks.
            </p>
          </div>
        </div>

        <nav className="p-3">
          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Navigation
          </div>

          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-white/10 text-blue-100 group-hover:bg-white/15"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span>{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-2 py-2 shadow-[0_-14px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-[86px] shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
                    : "bg-white text-[var(--muted-strong)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="line-clamp-2 text-center leading-tight">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
