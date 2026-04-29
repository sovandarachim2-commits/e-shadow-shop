"use client";

import { X } from "lucide-react";
import { useToastStore } from "@/lib/toast-store";

export function Toasts() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-32px)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium shadow-soft ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-black text-white dark:bg-white dark:text-black"
          }`}
        >
          <span>{toast.message}</span>
          <button aria-label="Dismiss toast" onClick={() => remove(toast.id)} className="rounded-full p-1 transition hover:bg-white/15">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
