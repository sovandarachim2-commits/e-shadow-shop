"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Mail, MapPinned, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { UserSession } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const storeUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [user, setLocalUser] = useState<UserSession | null>(storeUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        setLocalUser(data.user);
      })
      .catch(() => {
        logout();
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [logout, router, setUser]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    logout();
    router.push("/");
  }

  if (loading) {
    return <section className="container-page py-12 text-[#697b91]">Loading profile...</section>;
  }

  if (!user) return null;

  return (
    <section className="beauty-surface min-h-[calc(100vh-80px)] py-12">
      <div className="container-page grid place-items-center">
        <div className="w-full max-w-xl rounded-[34px] bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#fff8f3] text-[#082b4c]">
              <UserRound size={38} />
            </div>
            <h1 className="mt-5 font-serif text-4xl font-bold text-[#082b4c]">{user.name}</h1>
            <p className="mt-1 text-sm font-bold text-[#e9897e]">@{user.username || "customer"}</p>
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl bg-[#fff8f3] p-5 text-sm">
            {user.phone ? (
              <div className="flex items-center gap-3 text-[#697b91]">
                <Phone size={18} />
                <span>{user.phone}</span>
              </div>
            ) : null}
            {user.email ? (
              <div className="flex items-center gap-3 text-[#697b91]">
                <Mail size={18} />
                <span>{user.email}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-3 text-[#697b91]">
              <UserRound size={18} />
              <span>{user.role}</span>
            </div>
          </div>

          <Link href="/profile/address" className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#fff8f3] px-5 py-4 text-sm font-black text-[#082b4c] transition hover:bg-[#f8ded8]">
            <MapPinned size={18} />
            Address Location
          </Link>

          <Button onClick={signOut} className="mt-8 w-full">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </div>
    </section>
  );
}
