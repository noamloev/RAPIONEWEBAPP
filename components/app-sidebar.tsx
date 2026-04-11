"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  FileBarChart2,
  PieChart,
  Users,
  Settings,
  PhoneIcon,
  PersonStandingIcon,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const items = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "nav.clients", icon: PersonStandingIcon },
  { href: "/products", labelKey: "nav.products", icon: Package },
  { href: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { href: "/daily-report", labelKey: "nav.daily_report", icon: FileBarChart2 },
  { href: "/follow-up", labelKey: "nav.follow_up", icon: PhoneIcon },
  { href: "/product-statistics", labelKey: "nav.product_statistics", icon: PieChart },
  { href: "/worker-statistics", labelKey: "nav.worker_statistics", icon: Users },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="hidden w-[290px] shrink-0 border-r border-[var(--border)] bg-white/72 backdrop-blur-xl lg:block">
      <div className="border-b border-[var(--border)] px-6 py-6">
        <div className="rounded-[28px] border border-[var(--border)] bg-gradient-to-br from-[#fff7fb] via-white to-[#f8e8f0] p-5 shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--primary)]">
            Luxury Workspace
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--primary-deep)]">
            RapidOne
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Inventory, reports and audit control
          </p>
        </div>
      </div>

      <nav className="p-4">
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Navigation
        </div>

        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-[linear-gradient(135deg,#b55a80_0%,#8e4767_100%)] text-white shadow-[0_14px_28px_rgba(159,79,114,0.28)]"
                      : "text-[var(--muted-strong)] hover:bg-[var(--card-soft)] hover:text-[var(--primary-deep)]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      active
                        ? "bg-white/16 text-white"
                        : "bg-white text-[var(--primary-dark)] shadow-sm group-hover:bg-white"
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
  );
}