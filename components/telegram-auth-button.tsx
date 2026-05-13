"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

type TelegramAuthData = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

declare global {
  interface Window {
    Telegram?: unknown;
  }
}

function getRedirectPath(searchParams: URLSearchParams, fallback: string) {
  return searchParams.get("redirect") || fallback;
}

function TelegramAuthButtonContent({
  mode = "continue",
  variant = "default",
  defaultRedirect = "/profile"
}: {
  mode?: "continue" | "signup" | "signin";
  variant?: "default" | "compact";
  defaultRedirect?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToastStore((state) => state.push);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackName = useMemo(() => `__shadowTelegramAuth_${Math.random().toString(36).slice(2)}`, []);
  const [submitting, setSubmitting] = useState(false);
  const botUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
  const compact = variant === "compact";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    container.innerHTML = "";
    (window as unknown as Record<string, (user: TelegramAuthData) => void>)[callbackName] = async (authData) => {
      setSubmitting(true);
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authData, mode })
      });
      const data = await response.json().catch(() => ({}));
      setSubmitting(false);

      if (!response.ok) {
        toast(data.message || "Telegram sign-in failed", "error");
        return;
      }

      setAuth(data.token, data.user);
      const fallback = data.user?.role === "CUSTOMER" ? defaultRedirect : "/admin/dashboard";
      router.push(getRedirectPath(new URLSearchParams(searchParams.toString()), fallback));
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      container.innerHTML = "";
    };
  }, [botUsername, callbackName, defaultRedirect, mode, router, searchParams, setAuth, toast]);

  if (!botUsername) {
    return (
      <div className="grid gap-3">
        <div className="flex justify-center">
          <div
            className={`overflow-hidden rounded-xl border border-[#dfe5f3] bg-white shadow-sm opacity-60 grayscale ${
              compact ? "w-[280px]" : "w-[320px]"
            }`}
            aria-disabled="true"
          >
            <div className="flex h-[52px] items-center justify-center gap-3 px-4 text-sm font-semibold text-[#7d8797]">
              <Send size={18} />
              <span>{mode === "signup" ? "Sign up with Telegram" : mode === "signin" ? "Sign in with Telegram" : "Continue with Telegram"}</span>
            </div>
          </div>
        </div>
        <p className="text-center text-xs font-bold text-neutral-500">Telegram sign-in is not configured yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className={`grid min-h-[52px] place-items-center overflow-hidden rounded-xl border border-[#dfe5f3] bg-white shadow-sm ${
            compact ? "w-[280px]" : "w-[320px]"
          }`}
        />
      </div>
      {submitting ? <p className="text-center text-xs font-bold text-neutral-500">Connecting Telegram account...</p> : null}
    </div>
  );
}

export function TelegramAuthButton(props: {
  mode?: "continue" | "signup" | "signin";
  variant?: "default" | "compact";
  defaultRedirect?: string;
}) {
  return (
    <Suspense fallback={null}>
      <TelegramAuthButtonContent {...props} />
    </Suspense>
  );
}
