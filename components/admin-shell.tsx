"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  Home,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu,
  Images,
  Package,
  WalletCards,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Truck,
  Video,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

const groups = [
  {
    label: "Main",
    links: [
      { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/admin/home", label: "Home Page Content", icon: Home },
      { href: "/admin/routine-video", label: "Routine Video", icon: Video },
      { href: "/admin/routine-poster", label: "Routine Poster", icon: Images },
      { href: "/admin/orders", label: "Orders", icon: ReceiptText },
      { href: "/admin/delivery", label: "Delivery Settings", icon: Truck },
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/staff", label: "Staff Management", icon: Users }
    ]
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/brands", label: "Brands", icon: BadgeCheck },
      { href: "/admin/categories", label: "Categories", icon: ListTree },
      { href: "/admin/customers", label: "Customers", icon: Users }
    ]
  },
  {
    label: "Insights",
    links: [{ href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 }]
  },
  {
    label: "Others",
    links: [
      { href: "/admin/payment-methods", label: "Payment Methods", icon: WalletCards },
      { href: "/admin/settings", label: "Settings", icon: Settings }
    ]
  }
];

function AdminMenuContent({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-[#202733] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#5bc5f2] text-white shadow-[0_12px_28px_rgba(91,197,242,0.22)]">
            <Package size={23} />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-400">Admin Tools</p>
            <p className="text-xl font-black text-white">E Shadow</p>
          </div>
        </div>
        <ChevronDown size={20} className="text-slate-500" />
      </div>

      <nav className="mt-8 grid gap-7">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-3 px-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{group.label}</p>
            <div className="grid gap-2">
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-black transition ${
                      active ? "bg-[#263a4d] text-[#5bc5f2] shadow-[inset_0_0_0_1px_rgba(91,197,242,0.1)]" : "text-slate-300 hover:bg-[#202733] hover:text-white"
                    }`}
                  >
                    <Icon size={19} className={active ? "text-[#5bc5f2]" : "text-slate-500"} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-[24px] border border-white/10 bg-[#202733] p-5 text-white">
        <Sparkles size={22} className="text-[#5bc5f2]" />
        <p className="mt-3 text-sm font-black">Lumina Admin</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">Sales, products, reports, and staff in one clean desk.</p>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "CUSTOMER") router.push("/");
      setChecking(false);
      return;
    }

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (data.user.role === "CUSTOMER") router.push("/");
        else setUser(data.user);
      })
      .catch(() => router.push("/login"))
      .finally(() => setChecking(false));
  }, [router, setUser, user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (checking) {
    return <section className="admin-workspace grid min-h-screen place-items-center text-sm font-semibold text-neutral-500">Loading dashboard...</section>;
  }

  return (
    <section className="admin-workspace">
      <div className="grid min-h-screen w-full gap-0 px-3 py-3 lg:grid-cols-[300px_1fr] lg:px-6 lg:py-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-[#252e3b] bg-[#171d26] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.14)] lg:block">
          <AdminMenuContent pathname={pathname} />
        </aside>

        <div className="min-w-0 lg:pl-6">
          <header className="admin-card sticky top-3 z-20 mb-5 flex min-h-20 items-center justify-between gap-4 rounded-[26px] px-5 lg:top-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open admin menu"
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#dce9f5] bg-white text-[#1d2530] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#8b9aae]">Welcome back,</p>
                <h1 className="truncate text-2xl font-black text-[#1d2530]">{user?.name || "Admin"}</h1>
              </div>
            </div>
            <div className="hidden flex-1 justify-center md:flex">
              <label className="flex h-12 w-full max-w-md items-center gap-3 rounded-2xl border border-[#e4edf7] bg-[#f8fbff] px-4 text-sm text-[#7d8ca2] shadow-sm">
                <Search size={20} />
                <input className="w-full bg-transparent outline-none" placeholder="Search..." />
                <span className="rounded-lg border border-[#e4edf7] bg-white px-2 py-1 text-xs font-bold text-[#9aa8b9]">Ctrl K</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-2xl bg-[#effaff] px-4 py-3 text-sm font-black text-[#1c9ad0] sm:flex">
                <span className="h-2.5 w-2.5 rounded-full bg-[#55c7f2]" />
                Opened
              </span>
              <button className="grid h-12 w-12 place-items-center rounded-full border border-[#e4edf7] bg-white text-[#1d2530]">
                <Bell size={19} />
              </button>
              <Link href="/" className="grid h-12 w-12 place-items-center rounded-full border border-[#e4edf7] bg-white text-[#1d2530]" title="Back to shop">
                <LogOut size={19} />
              </Link>
            </div>
          </header>

          <main className="pb-6">{children}</main>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#15130f]/35 backdrop-blur-sm"
          />
          <aside className="admin-card relative z-10 h-full w-[min(360px,calc(100vw-28px))] overflow-y-auto rounded-r-[28px] p-5">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                aria-label="Close admin menu"
                onClick={() => setMobileMenuOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-neutral-200 bg-white text-[#15130f]"
              >
                <X size={19} />
              </button>
            </div>
            <AdminMenuContent pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      )}
    </section>
  );
}
