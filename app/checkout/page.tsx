"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronRight, CircleDollarSign, MapPinned, Phone, Plus, Send, UserRound, X } from "lucide-react";
import { AddressMapPreview } from "@/components/address-map-preview";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/lib/auth-store";
import { defaultPaymentMethods, type PaymentMethodSetting } from "@/lib/payment-methods";

type SavedAddressLocation = {
  id: string;
  label: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  address: string;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.total());
  const clear = useCartStore((state) => state.clear);
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethods[0]?.name || "");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>(defaultPaymentMethods.filter((method) => method.isActive));
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    province: "",
    note: "",
    contactTelegram: false
  });
  const [savedLocations, setSavedLocations] = useState<SavedAddressLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const selectedSavedLocation = savedLocations.find((location) => location.id === selectedLocationId) || null;
  const total = subtotal;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (data.user?.name) setForm((current) => ({ ...current, customerName: current.customerName || data.user.name }));
        if (data.user?.phone) setForm((current) => ({ ...current, phone: current.phone || data.user.phone }));
      })
      .catch(() => router.push("/login?redirect=/checkout"));
  }, [router]);

  useEffect(() => {
    fetch("/api/settings/payment-methods")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const activeMethods = Array.isArray(data.paymentMethods)
          ? data.paymentMethods.filter((method: PaymentMethodSetting) => method.isActive)
          : defaultPaymentMethods.filter((method) => method.isActive);
        const nextMethods = activeMethods.length ? activeMethods : defaultPaymentMethods.filter((method) => method.isActive);
        setPaymentMethods(nextMethods);
        setPaymentMethod((current) => (nextMethods.some((method) => method.name === current) ? current : nextMethods[0]?.name || ""));
      })
      .catch(() => {
        const fallbackMethods = defaultPaymentMethods.filter((method) => method.isActive);
        setPaymentMethods(fallbackMethods);
        setPaymentMethod((current) => (fallbackMethods.some((method) => method.name === current) ? current : fallbackMethods[0]?.name || ""));
      });
  }, []);

  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/address-locations", { headers })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const locations = data.locations || [];
        setSavedLocations(locations);
        const defaultLocation = locations.find((location: SavedAddressLocation) => location.isDefault) || locations[0];
        if (!defaultLocation) return;
        setSelectedLocationId(defaultLocation.id);
        setForm((current) => ({
          ...current,
          customerName: current.customerName || defaultLocation.recipientName || "",
          phone: current.phone || defaultLocation.recipientPhone || "",
          address: defaultLocation.address || "",
          province: defaultLocation.province || ""
        }));
      })
      .catch(() => {
        setSavedLocations([]);
        setSelectedLocationId("");
      });
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        ...form,
        paymentMethod,
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity, price: Number(item.price) }))
      })
    });
    setLoading(false);
    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?redirect=/checkout");
        return;
      }
      toast("Could not place order", "error");
      return;
    }
    clear();
    toast("Order placed successfully");
    router.push("/orders");
  }

  return (
    <section className="container-page py-12">
      {addressModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#082b4c]/40 px-4 py-4 backdrop-blur-[2px] md:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f3c7b8]/50 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9897e]">Delivery Address</p>
                <h3 className="mt-1 text-2xl font-black text-[#082b4c]">Choose Address Location</h3>
              </div>
              <button type="button" onClick={() => setAddressModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fff8f3] text-[#082b4c]">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
              <AddressMapPreview
                address={selectedSavedLocation?.address || savedLocations[0]?.address}
                province={selectedSavedLocation?.province || savedLocations[0]?.province}
                latitude={selectedSavedLocation?.latitude || savedLocations[0]?.latitude}
                longitude={selectedSavedLocation?.longitude || savedLocations[0]?.longitude}
                title="Selected checkout address map preview"
                className="mb-4"
              />
              <div className="mb-4 flex justify-end">
                <Link href="/profile/address" className="inline-flex items-center gap-2 rounded-2xl bg-[#15130f] px-4 py-3 text-sm font-black text-white">
                  <Plus size={16} />
                  Add New Address
                </Link>
              </div>

              {savedLocations.length ? (
                <div className="grid gap-3">
                  {savedLocations.map((location) => {
                    const active = location.id === selectedLocationId;
                    return (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocationId(location.id);
                          setForm((current) => ({
                            ...current,
                            customerName: location.recipientName || current.customerName,
                            phone: location.recipientPhone || current.phone,
                            address: location.address || "",
                            province: location.province || ""
                          }));
                          setAddressModalOpen(false);
                        }}
                        className={`grid gap-3 rounded-[28px] border px-4 py-4 text-left transition ${
                          active ? "border-[#e9897e] bg-[#fff8f3]" : "border-[#f3c7b8]/60 bg-white hover:bg-[#fffdfb]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 grid h-6 w-6 place-items-center rounded-full border-2 ${active ? "border-[#f0b400] bg-[#f0b400]" : "border-neutral-300 bg-white"}`}>
                            {active ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-[#082b4c]">{location.label}</p>
                              {location.isDefault ? <span className="rounded-full bg-[#fff5c4] px-2.5 py-1 text-[11px] font-black text-[#15130f]">Default</span> : null}
                            </div>
                            {location.recipientName || location.recipientPhone ? (
                              <p className="mt-2 text-sm font-bold text-[#082b4c]">
                                {[location.recipientName, location.recipientPhone].filter(Boolean).join(" , ")}
                              </p>
                            ) : null}
                            <p className="mt-2 text-sm leading-6 text-[#697b91]">{location.address}</p>
                            {location.province ? <p className="mt-2 text-xs font-bold text-[#e9897e]">{location.province}</p> : null}
                            {typeof location.latitude === "number" && typeof location.longitude === "number" ? (
                              <p className="mt-2 text-[11px] font-bold text-[#082b4c]">GPS pinned location saved</p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] bg-[#fff8f3] px-5 py-8 text-center">
                  <MapPinned className="mx-auto text-[#e9897e]" size={34} />
                  <p className="mt-4 text-lg font-black text-[#082b4c]">No saved address yet</p>
                  <p className="mt-2 text-sm text-[#697b91]">Add a delivery address first, then select it here for checkout.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <h1 className="flex items-center justify-center gap-3 font-serif text-5xl font-bold text-[#082b4c]">
        <CircleDollarSign className="text-[#082b4c]" size={34} />
        Checkout
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_390px]">
        <form onSubmit={submit} className="grid gap-8">
          <section>
            <h2 className="font-serif text-3xl font-bold text-[#082b4c]">Buyer Information</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                Name: *
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
                  <Input required placeholder="Ex: John Doe" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} className="pl-11" />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                Phone Number: *
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
                  <Input required placeholder="Ex: 0xx xxx xxx" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="pl-11" />
                </div>
              </label>
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-3xl font-bold text-[#082b4c]">Delivery Information</h2>
                <p className="mt-2 text-sm text-[#697b91]">Tap the address card to choose, add, or manage saved delivery locations.</p>
              </div>
            </div>
            <p className="mt-3 text-[#697b91]">
              We will provide to <span className="ml-2 font-black italic text-red-600">J&amp;T</span>
            </p>
            <div className="mt-5 grid gap-4">
              {token ? (
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  className="flex items-start justify-between gap-4 rounded-[28px] border border-[#f3c7b8]/70 bg-white px-5 py-5 transition hover:bg-[#fff8f3]"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="mt-1 text-[#697b91]">
                      <MapPinned size={24} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#082b4c]">
                        {selectedSavedLocation ? selectedSavedLocation.label : "Add delivery address"}
                      </p>
                      {selectedSavedLocation?.recipientName || selectedSavedLocation?.recipientPhone ? (
                        <p className="mt-1 text-sm font-bold text-[#082b4c]">
                          {[selectedSavedLocation.recipientName, selectedSavedLocation.recipientPhone].filter(Boolean).join(" , ")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm leading-6 text-[#697b91]">
                        {selectedSavedLocation ? selectedSavedLocation.address : "No saved address yet. Tap here to create one."}
                      </p>
                      {selectedSavedLocation?.province ? (
                        <p className="mt-2 text-xs font-bold text-[#e9897e]">{selectedSavedLocation.province}</p>
                      ) : null}
                      {typeof selectedSavedLocation?.latitude === "number" && typeof selectedSavedLocation?.longitude === "number" ? (
                        <p className="mt-2 text-[11px] font-bold text-[#082b4c]">GPS pinned location saved</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="mt-1 text-[#082b4c]">
                    <ChevronRight size={22} />
                  </span>
                </button>
              ) : null}
              <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                Note:
                <Textarea placeholder="..." value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </label>
              <label className="flex w-fit cursor-pointer items-center gap-3 text-sm font-bold text-[#082b4c]">
                <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${form.contactTelegram ? "bg-[#e9897e]" : "bg-[#f8ded8]"}`}>
                  <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${form.contactTelegram ? "translate-x-5" : ""}`} />
                </span>
                <input type="checkbox" checked={form.contactTelegram} onChange={(event) => setForm({ ...form, contactTelegram: event.target.checked })} className="sr-only" />
                Contact via <Send size={17} className="text-sky-500" /> Telegram
              </label>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-dashed border-[#f3c7b8] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-3xl font-bold text-[#082b4c]">Summary</h2>
            <div className="mt-5 grid gap-3 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <span>{item.name} x {item.quantity}</span>
                  <span>{money(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-between border-t border-dashed border-[#f3c7b8] pt-5 text-lg font-black text-[#082b4c]">
              <span className="text-[#697b91]">Total:</span>
              <span>{money(total)}</span>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-3xl font-bold text-[#082b4c]">Payment Method</h2>
            <div className="mt-5 grid gap-3">
              {paymentMethods.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.name)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                    paymentMethod === method.name ? "border-[#e9897e] bg-[#fff8f3]" : "border-[#f3c7b8]/70 bg-white hover:bg-[#fff8f3]"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span className={`grid h-9 w-12 place-items-center rounded text-xs font-black text-white ${method.name === "ABA KHQR" ? "bg-red-600" : "bg-blue-900"}`}>{method.badge}</span>
                    <span>
                      <span className="block font-black">{method.name}</span>
                      <span className="text-sm text-slate-500">{method.description}</span>
                    </span>
                  </span>
                  <span className={`grid h-6 w-6 place-items-center rounded-full border ${paymentMethod === method.name ? "border-[#082b4c] bg-[#082b4c] text-white" : "border-neutral-200 text-neutral-300"}`}>
                    <Check size={14} />
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-red-600">Choose one active payment method before you complete checkout.</p>
            <Button disabled={loading || items.length === 0 || !savedLocations.length || !selectedSavedLocation || !paymentMethods.length || !paymentMethod} className="mt-5 h-12 w-full">
              <CircleDollarSign size={19} />
              {loading ? "Purchasing..." : "Purchase"}
            </Button>
          </section>

        </form>

        <aside className="hidden lg:block" />
      </div>
    </section>
  );
}
