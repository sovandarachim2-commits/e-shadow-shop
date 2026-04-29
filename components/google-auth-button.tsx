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

export function GoogleAuthButton({ mode = "continue" }: { mode?: "continue" | "signup" | "signin" }) {
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
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: mode === "signup" ? "signup_with" : mode === "signin" ? "signin_with" : "continue_with",
      width: 320,
      logo_alignment: "left"
    });
  }, [mode, router, scriptLoaded, searchParams, setAuth, toast]);

  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  if (!hasClientId) return null;

  return (
    <div className="grid gap-3">
      <div ref={containerRef} className="flex justify-center" />
      {submitting ? <p className="text-center text-xs font-bold text-neutral-500">Connecting Google account...</p> : null}
    </div>
  );
}
