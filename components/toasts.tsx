"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToastStore } from "@/lib/toast-store";

function getToastCopy(type: "success" | "error" | undefined, message: string) {
  if (type === "error") {
    return {
      title: "Oooops!",
      body: message || "Something went wrong. Please try again.",
      button: "Try Again",
      tone: "error" as const
    };
  }

  return {
    title: "Success!",
    body: message || "Your action was completed.",
    button: "Continue",
    tone: "success" as const
  };
}

export function Toasts() {
  const { toasts, remove } = useToastStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!toasts.length) return;

    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [toasts.length]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center px-4">
      {toasts.slice(-1).map((toast) => {
        const copy = getToastCopy(toast.type, toast.message);
        const isError = copy.tone === "error";
        const remainingMs = Math.max(0, toast.createdAt + toast.durationMs - now);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const progress = Math.max(0, Math.min(100, (remainingMs / toast.durationMs) * 100));

        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[10px] border border-white/80 bg-white text-center shadow-[0_24px_70px_rgba(18,37,88,0.18)]"
            role="alertdialog"
            aria-labelledby={`toast-title-${toast.id}`}
            aria-describedby={`toast-body-${toast.id}`}
          >
            <div className="px-8 pb-8 pt-10">
              <div
                className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-[5px] ${
                  isError ? "border-[#e52626] text-[#e52626]" : "border-[#2498e5] text-[#2498e5]"
                }`}
              >
                {isError ? <AlertCircle size={42} strokeWidth={2.4} /> : <CheckCircle2 size={42} strokeWidth={2.4} />}
              </div>

              <h2 id={`toast-title-${toast.id}`} className={`mt-8 text-3xl font-black ${isError ? "text-[#e52626]" : "text-[#2498e5]"}`}>
                {copy.title}
              </h2>
              <div className={`mx-auto mt-3 h-1 w-12 rounded-full ${isError ? "bg-[#f3b5b5]" : "bg-[#b9ddf6]"}`} />
              <p id={`toast-body-${toast.id}`} className="mx-auto mt-6 max-w-[260px] text-base leading-7 text-[#7b8190]">
                {copy.body}
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#9aa3b5]">
                Auto closes in {remainingSeconds}s
              </p>
              <div className="mx-auto mt-3 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-[#eef1f7]">
                <div
                  className={`h-full rounded-full transition-[width] duration-200 ${isError ? "bg-[#e91f1f]" : "bg-[#4388ee]"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button
                type="button"
                onClick={() => remove(toast.id)}
                className={`mt-6 h-12 w-full max-w-[240px] rounded-md text-base font-bold text-white shadow-[0_12px_26px_rgba(18,37,88,0.16)] transition hover:brightness-105 ${
                  isError ? "bg-[#e91f1f]" : "bg-[#4388ee]"
                }`}
              >
                {copy.button}
              </button>
            </div>

            <div
              className={`h-16 opacity-70 ${
                isError
                  ? "bg-[linear-gradient(160deg,transparent_0%,rgba(229,38,38,0.05)_22%,rgba(229,38,38,0.16)_100%)]"
                  : "bg-[linear-gradient(160deg,transparent_0%,rgba(36,152,229,0.06)_22%,rgba(36,152,229,0.18)_100%)]"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
