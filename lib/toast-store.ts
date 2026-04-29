"use client";

import { create } from "zustand";

type Toast = { id: string; message: string; type?: "success" | "error" };

type ToastStore = {
  toasts: Toast[];
  push: (message: string, type?: Toast["type"]) => void;
  remove: (id: string) => void;
};

function createToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, type = "success") => {
    const id = createToastId();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 3200);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));
