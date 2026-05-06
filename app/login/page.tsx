"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LockKeyhole, Mail, ShoppingBag } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { UserSession } from "@/lib/types";
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
    const responseText = await response.text();
    let data: { message?: string; token?: string; user?: UserSession } = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: "Login failed. The server returned an invalid response." };
      }
    }

    setLoading(false);
    if (!response.ok) return toast(data.message || "Login failed", "error");
    if (!data.token || !data.user) return toast("Login failed. Missing session data.", "error");
    setAuth(data.token, data.user);
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(redirect || (data.user.role === "CUSTOMER" ? "/" : "/admin/dashboard"));
  }

  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[linear-gradient(135deg,#2160ff_0%,#1a4cd6_32%,#f6f7fb_32%,#f6f7fb_100%)] py-6 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)]" />
      <div className="container-page relative grid min-h-[78vh] place-items-center">
        <form onSubmit={submit} className="w-full max-w-[560px] rounded-[34px] border border-white/70 bg-white px-6 py-10 shadow-[0_30px_90px_rgba(10,37,112,0.18)] md:px-12 md:py-12">
          <div className="text-center">
            <p className="text-4xl font-black leading-[0.9] tracking-[0.04em] text-[#19398a] md:text-6xl">
              {brandName.split(" ").map((part, index) => (
                <span key={`${part}-${index}`} className="block">
                  {part}
                </span>
              ))}
            </p>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.4em] text-[#4c76ef]">{DEFAULT_BRAND_TAGLINE}</p>
            <p className="mt-8 text-3xl font-black text-[#1a1a1a] md:text-5xl">Login here!</p>
            <p className="mt-3 text-base font-semibold text-[#2b2b2b]">Welcome back you&apos;ve been missed!</p>
          </div>

          <div className="mt-12 grid gap-5">
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-[#2e57d0] bg-white px-5 text-[#5f6882] shadow-[0_10px_24px_rgba(46,87,208,0.08)]">
              <Mail size={21} />
              <input required placeholder="Username or Email" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <label className="flex h-16 items-center gap-4 rounded-2xl border border-transparent bg-[#eef2ff] px-5 text-[#697b91]">
              <LockKeyhole size={21} />
              <input type="password" required placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full bg-transparent text-sm outline-none placeholder:text-[#9ba8b8]" />
            </label>
            <div className="text-right text-sm font-bold text-[#2e57d0]">Forgot your password?</div>
          </div>

          <div className="mt-10 flex justify-center">
            <Button disabled={loading} className="h-14 min-w-[280px] rounded-2xl bg-[#2e4fc3] px-10 text-lg font-black text-white shadow-[0_20px_30px_rgba(46,79,195,0.28)] hover:bg-[#2643a7]">
              {loading ? "SIGNING IN..." : "LOG IN"}
            </Button>
          </div>

          <div className="mt-12">
            <p className="mb-4 text-center text-sm font-bold text-[#2e57d0]">Or continue with</p>
            <GoogleAuthButton mode="signin" variant="compact" />
          </div>

          <div className="mt-10 text-center">
            <p className="text-base text-neutral-600">Or continue shopping</p>
            <div className="mt-5 flex justify-center">
              <Link href="/shop" className="grid h-14 w-14 place-items-center rounded-full bg-[#2e4fc3] text-white shadow-md">
                <ShoppingBag size={24} />
              </Link>
            </div>
            <p className="mt-10 border-t border-[#e8ebf8] pt-8 text-base text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link className="font-black text-[#2e57d0]" href={`/register${queryString}`}>
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
