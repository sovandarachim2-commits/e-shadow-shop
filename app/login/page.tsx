"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole, Mail, ShoppingBag } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE } from "@/lib/site-brand";
import { useToastStore } from "@/lib/toast-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToastStore((state) => state.push);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [queryString, setQueryString] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);

  useEffect(() => {
    setQueryString(window.location.search);

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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return toast(data.message || "Login failed", "error");
    setAuth(data.token, data.user);
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(redirect || (data.user.role === "CUSTOMER" ? "/" : "/admin/dashboard"));
  }

  return (
    <section className="beauty-surface relative min-h-[calc(100vh-80px)] overflow-hidden py-6 md:py-10">
      <div className="absolute inset-0 bg-[rgba(8,43,76,0.12)]" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(255,255,255,0))]" />
      <div className="container-page relative grid min-h-[78vh] place-items-center">
        <form onSubmit={submit} className="w-full max-w-[640px] rounded-[28px] border border-[#f1dfd8] bg-white px-6 py-10 shadow-[0_28px_80px_rgba(8,43,76,0.18)] md:px-14 md:py-14">
          <div className="text-center">
            <p className="text-5xl font-black leading-[0.9] tracking-[0.04em] text-[#082b4c] md:text-7xl">
              {brandName.split(" ").map((part, index) => (
                <span key={`${part}-${index}`} className="block">
                  {part}
                </span>
              ))}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.5em] text-[#e9897e]">{DEFAULT_BRAND_TAGLINE}</p>
            <p className="mt-10 text-3xl font-black text-black md:text-5xl">Welcome back!</p>
            <p className="mt-4 text-base text-neutral-500">{`Log in to your ${brandName} account`}</p>
          </div>

          <div className="mt-12 grid gap-5">
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-[#eee3de] bg-[#fffaf7] px-5 text-[#697b91]">
              <Mail size={21} />
              <input required placeholder="Username or Email" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-[#eee3de] bg-[#fffaf7] px-5 text-[#697b91]">
              <LockKeyhole size={21} />
              <input type="password" required placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <div className="text-right text-sm font-bold text-neutral-500">Forgot Password?</div>
          </div>

          <div className="mt-10 flex justify-center">
            <Button disabled={loading} className="h-14 min-w-[260px] rounded-2xl bg-[#082b4c] px-10 text-white shadow-lg hover:bg-[#0d3a64]">
              {loading ? "SIGNING IN..." : "LOG IN"}
            </Button>
          </div>

          <div className="mt-8">
            <p className="mb-4 text-center text-base font-bold text-neutral-500">Or continue with Google</p>
            <GoogleAuthButton mode="signin" />
          </div>

          <div className="mt-10 text-center">
            <p className="text-base text-neutral-600">Or continue shopping</p>
            <div className="mt-5 flex justify-center">
              <Link href="/shop" className="grid h-14 w-14 place-items-center rounded-full bg-[#e9897e] text-white shadow-md">
                <ShoppingBag size={24} />
              </Link>
            </div>
            <p className="mt-10 border-t border-[#f0e6e0] pt-8 text-base text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link className="font-black text-[#e9897e]" href={`/register${queryString}`}>
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
