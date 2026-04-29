"use client";

import { CreditCard, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { defaultPaymentMethods, type PaymentMethodSetting } from "@/lib/payment-methods";
import { useToastStore } from "@/lib/toast-store";

function newMethod(index: number): PaymentMethodSetting {
  return {
    id: `custom-method-${Date.now()}-${index}`,
    name: "",
    description: "",
    badge: "PAY",
    isActive: true
  };
}

export default function AdminPaymentMethodsPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>(defaultPaymentMethods);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/payment-methods")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setPaymentMethods(data.paymentMethods || defaultPaymentMethods))
      .catch(() => setPaymentMethods(defaultPaymentMethods))
      .finally(() => setLoading(false));
  }, []);

  function updateMethod(index: number, field: keyof PaymentMethodSetting, value: string | boolean) {
    setPaymentMethods((current) =>
      current.map((method, methodIndex) => (methodIndex === index ? { ...method, [field]: value } : method))
    );
  }

  function addMethod() {
    setPaymentMethods((current) => [...current, newMethod(current.length)]);
  }

  function removeMethod(index: number) {
    setPaymentMethods((current) => current.filter((_, methodIndex) => methodIndex !== index));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const cleanedMethods = paymentMethods
      .map((method, index) => ({
        ...method,
        id: method.id || `payment-method-${index + 1}`,
        name: method.name.trim(),
        description: method.description.trim(),
        badge: method.badge.trim().slice(0, 8) || method.name.trim().slice(0, 4).toUpperCase() || "PAY"
      }))
      .filter((method) => method.name);

    if (!cleanedMethods.length) {
      toast("Add at least one payment method", "error");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/settings/payment-methods", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ paymentMethods: cleanedMethods })
    });
    setSaving(false);

    if (!response.ok) {
      toast("Could not save payment methods", "error");
      return;
    }

    const data = await response.json();
    setPaymentMethods(data.paymentMethods || cleanedMethods);
    toast("Payment methods saved");
  }

  const activeCount = paymentMethods.filter((method) => method.isActive && method.name.trim()).length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Others</p>
          <h1 className="text-4xl font-black text-[#15130f]">Payment Methods</h1>
          <p className="mt-2 text-sm text-neutral-500">Add checkout payment choices and control whether each method is visible to customers.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-[22px] border border-[#f3c7b8]/70 bg-white px-4 py-3 text-sm font-black text-[#082b4c]">
            {loading ? "Loading..." : `${activeCount} active methods`}
          </div>
          <Button type="button" onClick={addMethod} className="rounded-2xl">
            <Plus size={18} />
            Add Method
          </Button>
        </div>
      </div>

      <form onSubmit={submit} className="admin-card grid gap-5 rounded-[26px] p-5">
        <div className="grid gap-4">
          {paymentMethods.map((method, index) => (
            <div key={method.id || index} className="rounded-[24px] border border-neutral-200 bg-[#fbfaf7] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#082b4c] shadow-sm">
                    <CreditCard size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e9897e]">Method {index + 1}</p>
                    <p className="mt-1 text-lg font-black text-[#15130f]">{method.name.trim() || "New payment method"}</p>
                    <p className="mt-1 text-sm text-neutral-500">{method.isActive ? "Visible on checkout" : "Hidden from checkout"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateMethod(index, "isActive", !method.isActive)}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black transition ${
                      method.isActive ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {method.isActive ? "On" : "Off"}
                  </button>
                  <Button type="button" variant="outline" onClick={() => removeMethod(index)} className="rounded-2xl">
                    <Trash2 size={17} />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1.3fr_180px]">
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Payment name
                  <Input value={method.name} onChange={(event) => updateMethod(index, "name", event.target.value)} placeholder="ABA KHQR" />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Description
                  <Input
                    value={method.description}
                    onChange={(event) => updateMethod(index, "description", event.target.value)}
                    placeholder="Scan to pay with any banking app"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#15130f]">
                  Badge
                  <Input value={method.badge} maxLength={8} onChange={(event) => updateMethod(index, "badge", event.target.value.toUpperCase())} placeholder="KHQR" />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-neutral-100 pt-5">
          <Button disabled={saving} className="h-12 rounded-2xl">
            <Save size={18} />
            {saving ? "Saving..." : "Save Payment Methods"}
          </Button>
        </div>
      </form>
    </div>
  );
}
