"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleUserRound, History, Home, MapPinned, Menu, Search, ShoppingCart, Sparkles, Tag, UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/site-brand";

const links = [
  { href: "/", label: "Home Page" },
  { href: "/shop?promotion=sale", label: "On Sale" },
  { href: "/shop?promotion=new", label: "New Arrivals" }
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const count = useCartStore((state) => state.count());
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/shop?search=${encodeURIComponent(query)}`);
  }

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data.user) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
  }, [logout, setUser]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/footer")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data.footer?.brandName) setBrandName(data.footer.brandName);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  const accountHref = "/profile";
  const visibleUser = mounted ? user : null;
  const visibleCount = mounted ? count : 0;
  const accountLabel = visibleUser?.name || "Account";
  const showAdminMenu = visibleUser?.role === "ADMIN" || visibleUser?.role === "STAFF";
  const currentPromotion = searchParams.get("promotion") || "";

  function isActiveLink(href: string) {
    if (href === "/") return pathname === "/";
    if (href.includes("promotion=sale")) return pathname === "/shop" && currentPromotion === "sale";
    if (href.includes("promotion=new")) return pathname === "/shop" && currentPromotion === "new";
    return pathname === href;
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--champagne)]/80 bg-white/90 backdrop-blur-xl">
        <div className="container-page flex h-20 items-center justify-between gap-2 md:gap-5">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-full p-2 text-[var(--foreground)] transition hover:bg-[var(--panel)] md:hidden">
            <Menu size={24} />
          </button>

          <Link href="/" className="min-w-0 flex-1 text-center text-2xl font-black tracking-[0.02em] text-[var(--foreground)] md:max-w-[300px] md:flex-none md:text-4xl xl:max-w-none">
            <span className="block truncate">{brandName}</span>
            <span className="block text-center text-[10px] font-bold uppercase tracking-[0.44em] text-[var(--champagne-dark)] md:text-xs">{DEFAULT_BRAND_TAGLINE}</span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1 text-sm font-black lg:flex xl:gap-2">
            {links.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${
                    active ? "bg-[var(--panel)] text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface-tint)] hover:text-[var(--navy-soft)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {showAdminMenu && (
              <Link href="/admin/dashboard" className="whitespace-nowrap rounded-full px-3 py-2 text-[var(--foreground)] transition hover:bg-[var(--surface-tint)] hover:text-[var(--navy-soft)] xl:px-4">
                Admin
              </Link>
            )}
            {user && (
              <Link href="/orders" className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${pathname === "/orders" ? "bg-[var(--panel)] text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface-tint)] hover:text-[var(--navy-soft)]"}`}>
                Order History
              </Link>
            )}
            {user && (
              <Link href="/profile/address" className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${pathname === "/profile/address" ? "bg-[var(--panel)] text-[var(--foreground)]" : "text-[var(--foreground)] hover:bg-[var(--surface-tint)] hover:text-[var(--navy-soft)]"}`}>
                Address Location
              </Link>
            )}
          </nav>

          <form onSubmit={submitSearch} className="hidden flex-1 justify-end xl:flex">
            <label className="flex h-12 w-full max-w-[210px] items-center gap-3 rounded-full border border-[var(--champagne)] bg-white px-5 text-sm text-[var(--muted)] shadow-sm transition focus-within:border-[var(--navy-soft)] 2xl:max-w-[320px]">
              <Search size={23} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search for products..." />
            </label>
          </form>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button aria-label="Search" onClick={() => router.push("/shop")} className="rounded-full p-1.5 text-[var(--foreground)] transition hover:bg-[var(--panel)] sm:p-2 xl:hidden">
              <Search size={23} />
            </button>
            <Link href="/cart" aria-label="Cart" className="relative rounded-full p-1.5 text-[var(--foreground)] transition hover:bg-[var(--panel)] sm:p-2">
              <ShoppingCart size={24} />
              {visibleCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--navy-soft)] px-1 text-xs text-white">{visibleCount}</span>}
            </Link>
            {visibleUser ? (
              <Link href={accountHref} className="flex items-center gap-2 rounded-full px-1.5 py-1.5 text-[var(--foreground)] transition hover:bg-[var(--panel)] sm:px-2 sm:py-2" title={visibleUser.username || visibleUser.name}>
                <CircleUserRound size={24} />
                <span className="hidden max-w-24 truncate text-sm font-bold md:inline">{accountLabel}</span>
              </Link>
            ) : (
              <Link href="/login" aria-label="Login" className="rounded-full p-1.5 text-[var(--foreground)] transition hover:bg-[var(--panel)] sm:p-2">
                <CircleUserRound size={24} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-[var(--foreground)]/45 backdrop-blur-[2px]" />
          <aside className="relative flex h-dvh w-[min(86vw,390px)] flex-col overflow-hidden rounded-r-[34px] bg-white shadow-2xl">
            <div className="relative rounded-br-[34px] bg-[var(--panel)] px-6 pb-8 pt-8">
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute right-5 top-5 rounded-full p-2 text-[var(--foreground)] transition hover:bg-white/55"
              >
                <X size={24} />
              </button>
              <p className="text-3xl font-black tracking-[0.02em] text-[var(--foreground)]">{brandName}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.28em] text-[var(--champagne-dark)]">{DEFAULT_BRAND_TAGLINE}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-7">
              <nav className="grid gap-1 text-lg font-black text-[var(--foreground)]">
                {links.map((link) => (
                  <Link key={link.href} onClick={() => setOpen(false)} href={link.href} className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-[var(--surface-tint)]">
                    {link.href === "/" ? <Home size={24} className="text-[var(--muted)]" /> : link.href.includes("sale") ? <Tag size={24} className="text-[var(--muted)]" /> : <Sparkles size={24} className="text-[var(--muted)]" />}
                    {link.label}
                  </Link>
                ))}
                {showAdminMenu && (
                  <Link onClick={() => setOpen(false)} href="/admin/dashboard" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-[var(--surface-tint)]">
                    <UserCog size={24} className="text-[var(--muted)]" />
                    Admin
                  </Link>
                )}
                {user && (
                  <Link onClick={() => setOpen(false)} href="/orders" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-[var(--surface-tint)]">
                    <History size={24} className="text-[var(--muted)]" />
                    Order History
                  </Link>
                )}
                {user && (
                  <Link onClick={() => setOpen(false)} href="/profile/address" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-[var(--surface-tint)]">
                    <MapPinned size={24} className="text-[var(--muted)]" />
                    Address Location
                  </Link>
                )}
              </nav>
            </div>

            <div className="border-t border-[var(--champagne)]/70 px-6 py-5 text-center text-xs font-bold text-[var(--muted)]">
              Beauty shop menu
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
