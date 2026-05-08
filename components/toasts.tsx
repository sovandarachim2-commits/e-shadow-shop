"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useToastStore } from "@/lib/toast-store";

export function Toasts() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-32px))] gap-3">
      {toasts.slice(-3).map((toast) => {
        const isError = toast.type === "error";
        const Icon = isError ? AlertCircle : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-[0_18px_48px_rgba(18,37,88,0.16)] ${
              isError ? "border-red-100" : "border-emerald-100"
            }`}
            role="status"
          >
            <span
              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                isError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Icon size={18} />
            </span>
            <p className="min-w-0 flex-1 text-sm font-bold leading-6 text-[#15130f]">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-[#15130f]"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
