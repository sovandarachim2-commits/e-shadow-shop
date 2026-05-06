"use client";

import { Loader2, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/lib/toast-store";
import type { PaymentMethodSetting } from "@/lib/payment-methods";

export default function AdminPaymentMethodsPage() {
  const toast = useToastStore((state) => state.push);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/payment-methods")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setPaymentMethod((data.paymentMethods || [])[0] || null))
      .catch(() => toast("Could not load payment method settings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function save() {
    if (!paymentMethod) return;
    setSaving(true);
    const response = await fetch("/api/settings/payment-methods", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethods: [paymentMethod] })
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      toast(data.message || "Could not save payment method setting", "error");
      return;
    }

    setPaymentMethod((data.paymentMethods || [])[0] || paymentMethod);
    toast("Payment method setting saved");
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Others</p>
        <h1 className="text-4xl font-black text-[#15130f]">Payment Methods</h1>
        <p className="mt-2 text-sm text-neutral-500">Turn Bakong checkout on or off for new customer payments.</p>
      </div>

      <section className="admin-card rounded-[26px] p-5">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm font-bold text-neutral-500">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading payment settings...
          </div>
        ) : paymentMethod ? (
          <div className="grid gap-5">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff2f2] text-[#d32027] shadow-sm">
                <WalletCards size={24} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e9897e]">Checkout Payment</p>
                <h2 className="mt-2 text-2xl font-black text-[#15130f]">{paymentMethod.name}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{paymentMethod.description}</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-neutral-200 bg-[#faf8f3] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-[#15130f]">Bakong checkout status</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    When off, customers will not be able to generate a Bakong QR during checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentMethod((current) => (current ? { ...current, isActive: !current.isActive } : current))}
                  className={`inline-flex h-14 w-[108px] items-center rounded-full p-1 transition ${
                    paymentMethod.isActive ? "bg-[#2e57d0]" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full bg-white text-xs font-black text-[#15130f] shadow-sm transition ${
                      paymentMethod.isActive ? "translate-x-[52px]" : ""
                    }`}
                  >
                    {paymentMethod.isActive ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              <div className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-black text-white shadow-sm">
                <span className={paymentMethod.isActive ? "rounded-full bg-emerald-600 px-4 py-2" : "rounded-full bg-[#c55252] px-4 py-2"}>
                  {paymentMethod.isActive ? "Customers can pay with Bakong now" : "Bakong checkout is currently disabled"}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="h-12 min-w-40 rounded-2xl bg-[#15130f] text-white hover:bg-[#2a261f]">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] bg-[#fff8f3] p-5 text-sm font-bold text-neutral-500">No payment method configuration found.</div>
        )}
      </section>
    </div>
  );
}
