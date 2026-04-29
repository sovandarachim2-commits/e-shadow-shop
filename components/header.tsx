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
      <header className="sticky top-0 z-40 border-b border-[#f3c7b8]/70 bg-[#fff8f3]/90 backdrop-blur-xl">
        <div className="container-page flex h-20 items-center justify-between gap-2 md:gap-5">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-full p-2 text-[#082b4c] transition hover:bg-[#f8ded8] md:hidden">
            <Menu size={24} />
          </button>

          <Link href="/" className="min-w-0 flex-1 text-center text-2xl font-black tracking-[0.02em] text-[#082b4c] md:max-w-[300px] md:flex-none md:text-4xl xl:max-w-none">
            <span className="block truncate">{brandName}</span>
            <span className="block text-center text-[10px] font-bold uppercase tracking-[0.44em] text-[#e9897e] md:text-xs">{DEFAULT_BRAND_TAGLINE}</span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1 text-sm font-black lg:flex xl:gap-2">
            {links.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${
                    active ? "bg-[#f8ded8] text-[#082b4c]" : "text-[#082b4c] hover:bg-white hover:text-[#e9897e]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {showAdminMenu && (
              <Link href="/admin/dashboard" className="whitespace-nowrap rounded-full px-3 py-2 text-[#082b4c] transition hover:bg-white hover:text-[#e9897e] xl:px-4">
                Admin
              </Link>
            )}
            {user && (
              <Link href="/orders" className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${pathname === "/orders" ? "bg-[#f8ded8] text-[#082b4c]" : "text-[#082b4c] hover:bg-white hover:text-[#e9897e]"}`}>
                Order History
              </Link>
            )}
            {user && (
              <Link href="/profile/address" className={`whitespace-nowrap rounded-full px-3 py-2 transition xl:px-4 ${pathname === "/profile/address" ? "bg-[#f8ded8] text-[#082b4c]" : "text-[#082b4c] hover:bg-white hover:text-[#e9897e]"}`}>
                Address Location
              </Link>
            )}
          </nav>

          <form onSubmit={submitSearch} className="hidden flex-1 justify-end xl:flex">
            <label className="flex h-12 w-full max-w-[210px] items-center gap-3 rounded-full border border-[#f3c7b8] bg-white/85 px-5 text-sm text-[#697b91] shadow-sm transition focus-within:border-[#e9897e] 2xl:max-w-[320px]">
              <Search size={23} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search for products..." />
            </label>
          </form>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button aria-label="Search" onClick={() => router.push("/shop")} className="rounded-full p-1.5 text-[#082b4c] transition hover:bg-[#f8ded8] sm:p-2 xl:hidden">
              <Search size={23} />
            </button>
            <Link href="/cart" aria-label="Cart" className="relative rounded-full p-1.5 text-[#082b4c] transition hover:bg-[#f8ded8] sm:p-2">
              <ShoppingCart size={24} />
              {visibleCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e9897e] px-1 text-xs text-white">{visibleCount}</span>}
            </Link>
            {visibleUser ? (
              <Link href={accountHref} className="flex items-center gap-2 rounded-full px-1.5 py-1.5 text-[#082b4c] transition hover:bg-[#f8ded8] sm:px-2 sm:py-2" title={visibleUser.username || visibleUser.name}>
                <CircleUserRound size={24} />
                <span className="hidden max-w-24 truncate text-sm font-bold md:inline">{accountLabel}</span>
              </Link>
            ) : (
              <Link href="/login" aria-label="Login" className="rounded-full p-1.5 text-[#082b4c] transition hover:bg-[#f8ded8] sm:p-2">
                <CircleUserRound size={24} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#082b4c]/45 backdrop-blur-[2px]" />
          <aside className="relative flex h-dvh w-[min(86vw,390px)] flex-col overflow-hidden rounded-r-[34px] bg-[#fff8f3] shadow-2xl">
            <div className="relative rounded-br-[34px] bg-[#f8ded8] px-6 pb-8 pt-8">
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute right-5 top-5 rounded-full p-2 text-[#082b4c] transition hover:bg-white/55"
              >
                <X size={24} />
              </button>
              <p className="text-3xl font-black tracking-[0.02em] text-[#082b4c]">{brandName}</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.28em] text-[#e9897e]">{DEFAULT_BRAND_TAGLINE}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-7">
              <nav className="grid gap-1 text-lg font-black text-[#082b4c]">
                {links.map((link) => (
                  <Link key={link.href} onClick={() => setOpen(false)} href={link.href} className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-white">
                    {link.href === "/" ? <Home size={24} className="text-[#697b91]" /> : link.href.includes("sale") ? <Tag size={24} className="text-[#697b91]" /> : <Sparkles size={24} className="text-[#697b91]" />}
                    {link.label}
                  </Link>
                ))}
                {showAdminMenu && (
                  <Link onClick={() => setOpen(false)} href="/admin/dashboard" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-white">
                    <UserCog size={24} className="text-[#697b91]" />
                    Admin
                  </Link>
                )}
                {user && (
                  <Link onClick={() => setOpen(false)} href="/orders" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-white">
                    <History size={24} className="text-[#697b91]" />
                    Order History
                  </Link>
                )}
                {user && (
                  <Link onClick={() => setOpen(false)} href="/profile/address" className="flex min-h-14 items-center gap-4 rounded-2xl px-2 transition hover:bg-white">
                    <MapPinned size={24} className="text-[#697b91]" />
                    Address Location
                  </Link>
                )}
              </nav>
            </div>

            <div className="border-t border-[#f3c7b8]/70 px-6 py-5 text-center text-xs font-bold text-[#697b91]">
              Beauty shop menu
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
