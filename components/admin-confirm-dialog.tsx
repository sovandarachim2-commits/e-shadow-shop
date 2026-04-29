"use client";

import { AlertTriangle, X } from "lucide-react";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onCancel,
  onConfirm
}: AdminConfirmDialogProps) {
  if (!open) return null;

  const danger = tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#15130f]/40 px-4 backdrop-blur-sm">
      <section className="admin-card w-full max-w-md rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${danger ? "bg-red-50 text-red-600" : "bg-[#fff5c4] text-[#15130f]"}`}>
              <AlertTriangle size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#15130f]">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500">{message}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
            <X size={17} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-12 rounded-2xl border border-neutral-200 bg-white text-sm font-black text-[#15130f]">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={`h-12 rounded-2xl text-sm font-black text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#15130f] hover:bg-[#2b261d]"}`}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
