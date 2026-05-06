"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "continue_with" | "signin_with" | "signup_with";
              width?: number;
              logo_alignment?: "left" | "center";
            }
          ) => void;
        };
      };
    };
  }
}

function getRedirectPath(searchParams: URLSearchParams) {
  return searchParams.get("redirect") || "/";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.57-5.14 3.57-8.63Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-2.99c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.76-2.11-6.7-4.95H1.3v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.31A7.19 7.19 0 0 1 4.93 12c0-.8.14-1.58.37-2.31V6.6H1.3A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.3 5.4l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.33.61 4.57 1.8l3.43-3.43C17.94 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.3 6.6l4 3.09c.94-2.84 3.58-4.92 6.7-4.92Z"
      />
    </svg>
  );
}

function getButtonLabel(mode: "continue" | "signup" | "signin") {
  if (mode === "signup") return "Sign up with Google";
  if (mode === "signin") return "Sign in with Google";
  return "Continue with Google";
}

export function GoogleAuthButton({
  mode = "continue",
  variant = "default"
}: {
  mode?: "continue" | "signup" | "signin";
  variant?: "default" | "compact";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToastStore((state) => state.push);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (window.google?.accounts?.id) setScriptLoaded(true);
      else existingScript.addEventListener("load", () => setScriptLoaded(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const googleApi = window.google?.accounts?.id;
    const container = containerRef.current;

    if (!scriptLoaded || !clientId || !googleApi || !container) return;

    container.innerHTML = "";
    googleApi.initialize({
      client_id: clientId,
      ux_mode: "popup",
      callback: async ({ credential }) => {
        if (!credential) {
          toast("Google did not return a valid credential", "error");
          return;
        }

        setSubmitting(true);
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential })
        });
        const data = await response.json().catch(() => ({}));
        setSubmitting(false);

        if (!response.ok) {
          toast(data.message || "Google sign-in failed", "error");
          return;
        }

        setAuth(data.token, data.user);
        const redirect = getRedirectPath(new URLSearchParams(searchParams.toString()));
        router.push(redirect || (data.user.role === "CUSTOMER" ? "/" : "/admin/dashboard"));
      }
    });
    googleApi.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: mode === "signup" ? "signup_with" : mode === "signin" ? "signin_with" : "continue_with",
      width: variant === "compact" ? 280 : 320,
      logo_alignment: "left"
    });
  }, [mode, router, scriptLoaded, searchParams, setAuth, toast, variant]);

  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const buttonLabel = getButtonLabel(mode);
  const compact = variant === "compact";
  const buttonWidth = compact ? 280 : 320;

  return (
    <div className="grid gap-3">
      <div className="flex justify-center">
        {hasClientId ? (
          <div
            ref={containerRef}
            className="overflow-hidden rounded-xl border border-[#dfe5f3] bg-white shadow-sm"
            style={{ width: `${buttonWidth}px`, minHeight: "52px" }}
          />
        ) : (
          <div
            className={`overflow-hidden rounded-xl border border-[#dfe5f3] bg-white shadow-sm opacity-60 grayscale ${
              compact ? "w-[280px]" : "w-[320px]"
            }`}
            aria-disabled="true"
          >
            <div className="flex h-[52px] items-center justify-center gap-3 px-4 text-sm font-semibold text-[#7d8797]">
              <GoogleMark />
              <span>{buttonLabel}</span>
            </div>
          </div>
        )}
      </div>
      {!hasClientId ? (
        <p className="text-center text-xs font-bold text-neutral-500">Google sign-in is not configured yet.</p>
      ) : null}
      {submitting ? <p className="text-center text-xs font-bold text-neutral-500">Connecting Google account...</p> : null}
    </div>
  );
}
