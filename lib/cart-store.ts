"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Product } from "@/lib/types";

type CartStore = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  update: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return { items: state.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)) };
          }
          return { items: [...state.items, { ...product, quantity }] };
        }),
      update: (id, quantity) =>
        set((state) => ({
          items: quantity <= 0 ? state.items.filter((item) => item.id !== id) : state.items.map((item) => (item.id === id ? { ...item, quantity } : item))
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0)
    }),
    { name: "shadow-cart" }
  )
);
