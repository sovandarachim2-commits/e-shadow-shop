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
      <div className="flex items-center justify-between rounded-[22px] border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffdc1f] text-[#14120d]">
            <Package size={23} />
          </span>
          <div>
            <p className="text-xs font-bold text-neutral-500">Team</p>
            <p className="text-xl font-black text-[#15130f]">Product</p>
          </div>
        </div>
        <ChevronDown size={20} className="text-neutral-400" />
      </div>

      <nav className="mt-7 grid gap-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-xs font-black uppercase tracking-[0.08em] text-neutral-400">{group.label}</p>
            <div className="grid gap-1">
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-black transition ${
                      active ? "bg-[#ffdc1f] text-[#15130f]" : "text-[#28241d] hover:bg-[#f4f1eb]"
                    }`}
                  >
                    <Icon size={19} className={active ? "text-[#15130f]" : "text-neutral-400"} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-[22px] bg-[#15130f] p-5 text-white">
        <Sparkles size={22} className="text-[#ffdc1f]" />
        <p className="mt-3 text-sm font-black">Lumina Admin</p>
        <p className="mt-1 text-xs leading-5 text-white/60">Beauty stock, sales, and staff in one clean desk.</p>
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
      <div className="grid min-h-screen w-full gap-0 px-3 py-3 lg:grid-cols-[310px_1fr] lg:px-4">
        <aside className="admin-card sticky top-3 hidden h-[calc(100vh-24px)] overflow-y-auto rounded-[28px] p-5 lg:block">
          <AdminMenuContent pathname={pathname} />
        </aside>

        <div className="min-w-0 lg:pl-6">
          <header className="admin-card sticky top-3 z-20 mb-4 flex min-h-20 items-center justify-between gap-4 rounded-[26px] px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open admin menu"
                onClick={() => setMobileMenuOpen(true)}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-neutral-200 bg-white text-[#15130f] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-500">Good morning,</p>
                <h1 className="truncate text-2xl font-black text-[#15130f]">{user?.name || "Admin"}</h1>
              </div>
            </div>
            <div className="hidden flex-1 justify-center md:flex">
              <label className="flex h-12 w-full max-w-md items-center gap-3 rounded-2xl border border-neutral-200 bg-[#f8f7f3] px-4 text-sm text-neutral-500">
                <Search size={20} />
                <input className="w-full bg-transparent outline-none" placeholder="Search..." />
                <span className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-bold text-neutral-500">Ctrl K</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 sm:flex">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Opened
              </span>
              <button className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200 bg-white text-[#15130f]">
                <Bell size={19} />
              </button>
              <Link href="/" className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200 bg-white text-[#15130f]" title="Back to shop">
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
