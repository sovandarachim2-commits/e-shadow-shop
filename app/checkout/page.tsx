"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, CircleDollarSign, MapPinned, Phone, Plus, Send, UserRound, X } from "lucide-react";
import { AddressMapPreview } from "@/components/address-map-preview";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { money } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { useToastStore } from "@/lib/toast-store";
import { useAuthStore } from "@/lib/auth-store";
import { bakongPaymentMethod, type PaymentMethodSetting } from "@/lib/payment-methods";

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

type BakongPaymentSession = {
  paymentId: string;
  qr: string;
  md5: string;
  amount: number;
  currency: string;
  merchantName: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  expiresInMinutes: number;
  status: "WAITING" | "PAID" | "ERROR";
  message: string;
};

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.total());
  const clear = useCartStore((state) => state.clear);
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
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
  const [finalizingOrder, setFinalizingOrder] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<BakongPaymentSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [paymentMethodSetting, setPaymentMethodSetting] = useState<PaymentMethodSetting>(bakongPaymentMethod);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const selectedSavedLocation = savedLocations.find((location) => location.id === selectedLocationId) || null;
  const displayItems = hydrated ? items : [];
  const displaySubtotal = hydrated ? subtotal : 0;
  const displayDeliveryFee = displayItems.length ? Math.min(...displayItems.map((item) => Number(item.deliveryFee || 0))) : 0;
  const total = displaySubtotal + displayDeliveryFee;

  useEffect(() => {
    setHydrated(true);
  }, []);

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

  useEffect(() => {
    fetch("/api/settings/payment-methods")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const method = (data.paymentMethods || [])[0];
        if (method) setPaymentMethodSetting(method);
      })
      .catch(() => setPaymentMethodSetting(bakongPaymentMethod));
  }, []);

  const createOrderPayload = useCallback(() => {
    return {
      ...form,
      paymentMethod: paymentMethodSetting.name,
      paymentId: paymentSession?.paymentId,
      items: items.map((item) => ({ productId: item.id, quantity: item.quantity, price: Number(item.price) }))
    };
  }, [form, paymentMethodSetting.name, paymentSession?.paymentId, items]);

  const finalizeOrder = useCallback(async (paymentId?: string) => {
    if (finalizingOrder) return;
    if (!paymentId) return;

    setFinalizingOrder(true);
    setPaymentSession(null);
    setPaymentSuccessMessage("Payment successful. Completing your order...");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...createOrderPayload(), paymentId })
    });
    setFinalizingOrder(false);
    if (!response.ok) {
      setPaymentSuccessMessage(null);
      if (response.status === 401) {
        router.push("/login?redirect=/checkout");
        return;
      }
      toast("Payment was successful, but the order could not be saved yet", "error");
      return;
    }
    clear();
    setPaymentSuccessMessage("Payment successful");
    toast("Payment successful");
    router.push("/orders");
  }, [clear, createOrderPayload, finalizingOrder, router, toast, token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/payments/bakong/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        ...form,
        items: displayItems.map((item) => ({ productId: item.id, quantity: item.quantity }))
      })
    });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/login?redirect=/checkout");
        return;
      }
      toast(data.message || "Could not generate Bakong QR", "error");
      return;
    }

    const data = await response.json();
    setPaymentSession({
      ...data.payment,
      status: "WAITING",
      message: "Scan the QR with Bakong. We will confirm payment automatically."
    });
  }

  const paymentReference = paymentSession?.md5;
  const paymentId = paymentSession?.paymentId ?? null;
  const paymentExpiresInMinutes = paymentSession?.expiresInMinutes ?? 0;
  const paymentStatus = paymentSession?.status;
  const countdownLabel = formatCountdown(countdownSeconds);
  const paymentStatusLabel =
    paymentSession?.status === "PAID"
      ? "Payment confirmed"
      : paymentSession?.status === "ERROR"
        ? paymentSession.message
        : "Waiting for confirmation";

  useEffect(() => {
    if (!paymentId) {
      setCountdownSeconds(0);
      return;
    }

    const initialSeconds = Math.max(0, paymentExpiresInMinutes * 60);
    setCountdownSeconds(initialSeconds);
    const startedAt = Date.now();

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextSeconds = Math.max(0, initialSeconds - elapsedSeconds);
      setCountdownSeconds(nextSeconds);
      if (nextSeconds <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [paymentExpiresInMinutes, paymentId]);

  useEffect(() => {
    if (!paymentReference || paymentStatus === "PAID") return;

    let cancelled = false;
    const checkStatus = async () => {
      const paymentQuery = paymentId
        ? `paymentId=${encodeURIComponent(paymentId)}`
        : `md5=${encodeURIComponent(paymentReference)}`;
      const response = await fetch(`/api/payments/bakong/status?${paymentQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const data = await response.json().catch(() => ({}));
      if (cancelled) return;

      if (!response.ok || data.success === false) {
        setPaymentSession((current) =>
          current && current.md5 === paymentReference
            ? {
                ...current,
                status: "ERROR",
                message: data.message || data.error || "Could not check payment status right now."
              }
            : current
        );
        return;
      }

      if (data.status === "PAID") {
        setPaymentSession((current) =>
          current && current.md5 === paymentReference
            ? {
                ...current,
                status: "PAID",
                message: "Payment received. Completing your order..."
              }
            : current
        );
        await finalizeOrder(paymentId || data.paymentId);
        return;
      }

      setPaymentSession((current) =>
        current && current.md5 === paymentReference
          ? {
              ...current,
              status: "WAITING",
              message: data.message || "Waiting for Bakong payment confirmation..."
            }
          : current
      );
    };

    checkStatus();
    const timer = window.setInterval(checkStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [finalizeOrder, paymentId, paymentReference, paymentStatus, token]);

  return (
    <section className="container-page py-12">
      {paymentSuccessMessage ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-[#082b4c]/28 px-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm rounded-[30px] border border-white/70 bg-white px-6 py-8 text-center shadow-[0_26px_80px_rgba(10,37,112,0.22)]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#edf9f1] text-[#2f9a58]">
              <Check size={30} />
            </div>
            <h3 className="mt-5 text-2xl font-black text-[#173e82]">Payment Successful</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-[#6f86a7]">{paymentSuccessMessage}</p>
          </div>
        </div>
      ) : null}
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
      {paymentSession ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-[linear-gradient(135deg,rgba(33,96,255,0.26)_0%,rgba(26,76,214,0.18)_28%,rgba(246,247,251,0.78)_65%,rgba(246,247,251,0.92)_100%)] px-2 py-2 backdrop-blur-[6px] md:flex md:items-center md:justify-center md:px-4 md:py-4">
          <div className="mx-auto flex min-h-[calc(100dvh-16px)] w-full max-w-xl flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(10,37,112,0.20)] md:min-h-0 md:max-h-[92vh] md:overflow-y-auto md:rounded-[34px]">
              <div className="relative overflow-hidden border-b border-[#e8ebf8] px-4 py-4 md:px-7 md:py-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff8f7a_0%,#ffc071_50%,#4c76ef_100%)]" />
              <div className="absolute right-[-30px] top-[-42px] h-28 w-28 rounded-full bg-[rgba(76,118,239,0.10)] blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#4c76ef]">Bakong Checkout</p>
                  <h3 className="mt-1 font-serif text-[32px] font-bold leading-none text-[#19398a] md:mt-2 md:text-4xl">Scan To Pay</h3>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                      paymentSession.status === "PAID"
                        ? "bg-emerald-100 text-emerald-700"
                        : paymentSession.status === "ERROR"
                          ? "bg-red-100 text-red-600"
                          : "bg-[#eef2ff] text-[#355fb3]"
                    }`}
                  >
                    {paymentSession.status === "PAID" ? "Paid" : paymentSession.status === "ERROR" ? "Check Failed" : "Waiting"}
                  </span>
                  <button
                    type="button"
                    onClick={() => !finalizingOrder && setPaymentSession(null)}
                    disabled={finalizingOrder}
                    className="grid h-12 w-12 place-items-center rounded-full border border-[#dbe4fb] bg-white text-[#19398a] shadow-sm transition hover:bg-[#f4f7ff] disabled:opacity-60"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-2.5 px-3 py-3 md:gap-5 md:px-7 md:py-7">
              <div className="rounded-[24px] border border-[#e8ebf8] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-3.5 shadow-[0_18px_40px_rgba(33,96,255,0.08)] md:rounded-[30px] md:p-6">
                <div className="grid gap-2.5 place-items-center md:gap-6">
                  <div className="mx-auto w-full max-w-[286px] overflow-hidden rounded-[28px] border border-[#dbe4fb] bg-white shadow-[0_20px_42px_rgba(33,96,255,0.10)] md:max-w-[380px] md:rounded-[34px] md:shadow-[0_24px_52px_rgba(33,96,255,0.12)]">
                    <div className="relative bg-[#ec171c] px-4 pb-7 pt-4 text-center text-white md:px-5 md:pb-10 md:pt-5">
                      <p className="text-[34px] font-black leading-none tracking-[0.08em] md:text-[42px]">KHQR</p>
                      <div className="absolute bottom-0 right-0 h-16 w-16 bg-white [clip-path:polygon(100%_0,100%_100%,0_0)] md:h-20 md:w-20" />
                    </div>
                    <div className="bg-white px-5 pb-5 pt-4 md:px-7 md:pb-7 md:pt-6">
                      <p className="mt-1 text-left text-[12px] font-black uppercase tracking-[0.24em] text-[#7b8aa4]">Merchant</p>
                      <p className="mt-3 text-left text-[28px] font-black uppercase tracking-[0.02em] leading-none text-[#1a1a1a] md:text-[34px]">
                        {paymentSession.merchantName || "Bakong Merchant"}
                      </p>
                      <div className="mt-4 border-t border-dashed border-[#d8dbe5] md:mt-7" />
                      <div className="relative mt-3 rounded-[24px] bg-white px-1.5 pb-1.5 pt-1 md:mt-6 md:rounded-[28px] md:px-2 md:pb-2">
                        <Image
                          src={paymentSession.qr}
                          alt="Bakong QR"
                          width={640}
                          height={640}
                          unoptimized
                          className="mx-auto h-full w-full rounded-[16px]"
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="grid h-[48px] w-[48px] place-items-center rounded-full border-[4px] border-white bg-[#ec171c] shadow-[0_8px_18px_rgba(8,43,76,0.15)] md:h-[58px] md:w-[58px] md:border-[5px] md:shadow-[0_10px_22px_rgba(8,43,76,0.16)]">
                            <div className="relative h-6 w-6 md:h-7 md:w-7">
                              <span className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white" />
                              <span className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 bg-white [clip-path:polygon(50%_0%,61%_18%,80%_9%,82%_30%,100%_50%,82%_70%,80%_91%,61%_82%,50%_100%,39%_82%,20%_91%,18%_70%,0%_50%,18%_30%,20%_9%,39%_18%)]" />
                              <span className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ec171c]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="inline-flex rounded-full bg-[#2e4fc3] px-4 py-2 text-sm font-black text-white shadow-[0_16px_28px_rgba(46,79,195,0.22)] md:px-5 md:py-2.5">
                      Time left {countdownLabel}
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-black ${
                        paymentSession.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : paymentSession.status === "ERROR"
                            ? "bg-red-100 text-red-600"
                            : "bg-[#edf2ff] text-[#355fb3]"
                      } md:px-5 md:py-2.5`}
                    >
                      {paymentStatusLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e8ebf8] bg-[linear-gradient(135deg,#2e4fc3_0%,#2160ff_100%)] px-5 py-4 text-white shadow-[0_24px_42px_rgba(33,96,255,0.24)] md:rounded-[28px] md:px-6 md:py-6">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/75">Total Payment</p>
                <div className="mt-2.5 flex items-end justify-between gap-4 md:mt-3">
                  <span className="text-base font-bold text-white/80 md:text-lg">Amount</span>
                  <span className="text-[46px] font-black tracking-[-0.05em] leading-none md:text-[64px]">{money(paymentSession.total)}</span>
                </div>
              </div>
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
              {displayItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <span>{item.name} x {item.quantity}</span>
                  <span>{money(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-dashed border-[#f3c7b8] pt-5 text-sm">
              <div className="flex justify-between text-[#082b4c]">
                <span className="text-[#697b91]">Subtotal:</span>
                <span className="font-black">{money(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#082b4c]">
                <span className="text-[#697b91]">Delivery Fee:</span>
                <span className="font-black">{money(displayDeliveryFee)}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-between border-t border-dashed border-[#f3c7b8] pt-5 text-lg font-black text-[#082b4c]">
              <span className="text-[#697b91]">Total:</span>
              <span>{money(total)}</span>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-3xl font-bold text-[#082b4c]">Bakong Payment</h2>
            <div className="mt-5 rounded-[28px] border border-[#f3c7b8]/70 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-4">
                  <span className="grid h-10 w-14 place-items-center rounded-lg bg-[#d32027] text-xs font-black text-white">
                    {paymentMethodSetting.badge}
                  </span>
                  <span>
                    <span className="block text-lg font-black text-[#082b4c]">{paymentMethodSetting.name}</span>
                    <span className="text-sm text-slate-500">{paymentMethodSetting.description}</span>
                  </span>
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#082b4c] text-white">
                  <Check size={15} />
                </span>
              </div>
              <p className={`mt-4 text-sm font-bold ${paymentMethodSetting.isActive ? "text-[#2e57d0]" : "text-[#c55252]"}`}>
                {paymentMethodSetting.isActive ? "Checkout uses Bakong KHQR payment only." : "Bakong payment is currently turned off by admin."}
              </p>
            </div>
            <Button disabled={!paymentMethodSetting.isActive || !hydrated || loading || displayItems.length === 0 || !savedLocations.length || !selectedSavedLocation} className="mt-5 h-12 w-full">
              <CircleDollarSign size={19} />
              {loading ? "Generating QR..." : paymentMethodSetting.isActive ? "Pay with Bakong QR" : "Bakong Payment Unavailable"}
            </Button>
          </section>

        </form>

        <aside className="hidden lg:block" />
      </div>
    </section>
  );
}
