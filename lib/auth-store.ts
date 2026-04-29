"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserSession } from "@/lib/types";

type AuthStore = {
  token: string | null;
  user: UserSession | null;
  setAuth: (token: string, user: UserSession) => void;
  setUser: (user: UserSession) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null })
    }),
    { name: "shadow-auth" }
  )
);
