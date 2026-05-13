"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Crosshair, Loader2, MapPinned, Pencil, Plus, Trash2 } from "lucide-react";
import { AddressMapPreview } from "@/components/address-map-preview";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

type AddressLocation = {
  id: string;
  label: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  address: string;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  address: "",
  province: "",
  latitude: null as number | null,
  longitude: null as number | null,
  isDefault: false
};

const CAMBODIA_PROVINCES = [
  "Banteay Meanchey",
  "Battambang",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Kampot",
  "Kandal",
  "Kep",
  "Koh Kong",
  "Kratie",
  "Mondulkiri",
  "Oddar Meanchey",
  "Pailin",
  "Phnom Penh",
  "Preah Sihanouk",
  "Preah Vihear",
  "Prey Veng",
  "Pursat",
  "Ratanakiri",
  "Siem Reap",
  "Stung Treng",
  "Svay Rieng",
  "Takeo",
  "Tbong Khmum"
] as const;

function formatDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function AddressLocationPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [locations, setLocations] = useState<AddressLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [profileDefaults, setProfileDefaults] = useState({ recipientName: "", recipientPhone: "" });
  const formScrollRef = useRef<HTMLFormElement | null>(null);
  const sortedLocations = [...locations].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });

  const load = useCallback(async () => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch("/api/address-locations", { headers });
    if (response.status === 401) {
      router.push("/login?redirect=/profile/address");
      return;
    }
    const data = await response.json().catch(() => ({ locations: [] }));
    setLocations(data.locations || []);
    setLoading(false);
  }, [router, token]);

  useEffect(() => {
    load().catch(() => {
      setLocations([]);
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/auth/me", { headers })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const recipientName = data.user?.name || "";
        const recipientPhone = data.user?.phone || "";
        setProfileDefaults({ recipientName, recipientPhone });
        setForm((current) => ({
          ...current,
          recipientName: current.recipientName || recipientName,
          recipientPhone: current.recipientPhone || recipientPhone
        }));
      })
      .catch(() => null);
  }, [token]);

  useLayoutEffect(() => {
    if (!formOpen) return;

    const syncToTop = () => {
      formScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    };

    syncToTop();
    const timeoutId = window.setTimeout(syncToTop, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formOpen, editingId]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, ...profileDefaults });
    setFormOpen(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, ...profileDefaults });
    setFormOpen(true);
  }

  function startEdit(location: AddressLocation) {
    setEditingId(location.id);
    setFormOpen(true);
    setForm({
      label: location.label || "",
      recipientName: location.recipientName || profileDefaults.recipientName || "",
      recipientPhone: location.recipientPhone || profileDefaults.recipientPhone || "",
      address: location.address || "",
      province: location.province || "",
      latitude: typeof location.latitude === "number" ? location.latitude : null,
      longitude: typeof location.longitude === "number" ? location.longitude : null,
      isDefault: Boolean(location.isDefault)
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported on this device", "error");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setLocating(false);
        toast("Current location captured");
      },
      () => {
        setLocating(false);
        toast("Could not get current location", "error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const headers: HeadersInit = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const response = await fetch(editingId ? `/api/address-locations/${editingId}` : "/api/address-locations", {
      method: editingId ? "PUT" : "POST",
      headers,
      body: JSON.stringify(form)
    });
    setSaving(false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.message || "Could not save address location", "error");
      return;
    }

    toast(editingId ? "Address location updated" : "Address location added");
    resetForm();
    load();
  }

  async function remove(id: string) {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`/api/address-locations/${id}`, { method: "DELETE", headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.message || "Could not delete address location", "error");
      return;
    }
    toast("Address location deleted");
    if (editingId === id) resetForm();
    load();
  }

  if (loading) {
    return <section className="container-page py-12 text-[#697b91]">Loading address locations...</section>;
  }

  return (
    <section className="beauty-surface min-h-[calc(100vh-80px)] py-6 md:py-12">
      <div className="container-page grid gap-6">
        <div className="grid gap-4 rounded-[24px] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between md:rounded-[30px] md:p-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight text-[#082b4c] md:text-4xl">Address History</h1>
            <p className="mt-2 text-sm text-[#697b91]">{sortedLocations.length} saved {sortedLocations.length === 1 ? "address" : "addresses"}</p>
          </div>
          <Button type="button" onClick={startCreate} className="h-12 w-full rounded-2xl px-4 sm:w-auto sm:px-5">
            <Plus size={16} />
            Add New Address
          </Button>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[24px] bg-white p-4 shadow-sm md:rounded-[30px] md:p-5">
            <div className="min-w-0">
              <h2 className="text-xl font-black leading-tight text-[#082b4c] md:text-2xl">Address History</h2>
              <p className="mt-1 text-sm text-[#697b91]">Newest saved or updated address appears first.</p>
            </div>
          </div>

          {locations.length ? (
            <div className="grid gap-4">
              {sortedLocations.map((location) => (
                <article key={location.id} className="overflow-hidden rounded-[24px] bg-white shadow-sm md:rounded-[30px]">
                  <div className="grid gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5 lg:p-6">
                    <div className="min-w-0">
                      <AddressMapPreview address={location.address} province={location.province} latitude={location.latitude} longitude={location.longitude} title={`${location.label} map preview`} className="h-full" />
                      {typeof location.latitude === "number" && typeof location.longitude === "number" ? (
                        <p className="mt-3 break-words text-xs font-bold text-[#e9897e]">GPS pin: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                      ) : null}
                    </div>

                    <div className="flex h-full min-w-0 flex-col justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="min-w-0 break-words text-xl font-black leading-tight text-[#082b4c] md:text-2xl">{location.label}</h3>
                          {location.isDefault ? <span className="rounded-full bg-[#fff5c4] px-3 py-1 text-xs font-black text-[#15130f]">Default</span> : null}
                          <span className="rounded-full bg-[#f6f7fb] px-3 py-1 text-xs font-black text-[#697b91]">
                            Updated {formatDate(location.updatedAt) || formatDate(location.createdAt)}
                          </span>
                        </div>
                        {location.recipientName || location.recipientPhone ? (
                          <p className="mt-3 break-words text-sm font-bold text-[#082b4c]">
                            {[location.recipientName, location.recipientPhone].filter(Boolean).join(" , ")}
                          </p>
                        ) : null}
                        <p className="mt-3 break-words text-sm leading-7 text-[#697b91]">{location.address}</p>
                        {location.province ? <p className="mt-3 text-sm font-black text-[#e9897e]">{location.province}</p> : null}
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#9aa7b8]">
                          Created {formatDate(location.createdAt)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => startEdit(location)}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#fff8f3] px-4 text-sm font-black text-[#082b4c] transition hover:bg-[#f8ded8] sm:w-auto"
                        >
                          <Pencil size={16} />
                          Edit address
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(location.id)}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100 sm:w-auto"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] bg-white p-6 text-center shadow-sm md:rounded-[30px] md:p-10">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fff8f3] text-[#e9897e]">
                <MapPinned size={34} />
              </div>
              <p className="mt-5 text-2xl font-black text-[#082b4c]">No address history yet</p>
              <p className="mt-3 text-sm leading-6 text-[#697b91]">Add your first delivery address to start your saved location history and make checkout faster.</p>
              <Button type="button" onClick={startCreate} className="mt-6 h-12 w-full rounded-2xl px-5 sm:w-auto">
                <Plus size={16} />
                Add First Address
              </Button>
            </div>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[90] overflow-hidden bg-[#eef1f6] md:flex md:items-center md:justify-center md:bg-[#082b4c]/40 md:px-4 md:py-4 md:backdrop-blur-[2px]">
          <div className="flex h-full w-full flex-col overflow-hidden bg-[#f5f7fb] md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-[36px] md:bg-white md:shadow-2xl">
            <div className="flex items-start justify-between gap-2 bg-[#f5f7fb] px-3 pb-3 pt-3 md:items-center md:border-b md:border-[#eef1f5] md:bg-white md:px-6 md:py-5">
              <button type="button" onClick={resetForm} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl font-light text-[#082b4c] md:hidden">
                {"<"}
              </button>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <h2 className="text-xl font-black leading-tight text-[#082b4c] md:text-3xl">{editingId ? "Update saved location" : "Add New Address"}</h2>
                <p className="mt-1 text-xs leading-5 text-[#697b91] md:mt-2 md:text-sm md:leading-6">Place the pin on the map first, then fill the address details for faster checkout.</p>
              </div>
              <button type="button" onClick={resetForm} className="hidden rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-black text-[#082b4c] md:inline-flex">
                Close
              </button>
            </div>

            <form ref={formScrollRef} onSubmit={submit} className="grid min-h-0 flex-1 gap-4 overflow-y-auto bg-[#f5f7fb] px-0 pb-6 pt-0 md:bg-white md:px-6 md:py-6">
              <section className="mx-0 overflow-hidden border-b border-[#eef1f5] bg-white shadow-[0_12px_30px_rgba(8,43,76,0.04)] md:mx-0 md:rounded-[32px] md:border md:border-[#eef1f5] md:shadow-none">
                <div className="px-5 pb-3 pt-4 md:hidden">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9aa7b8]">Map Preview</p>
                </div>
                <AddressMapPreview
                  address={form.address}
                  province={form.province}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  title="Address location map preview"
                  className="min-h-[320px] rounded-none border-x-0 border-t-0 shadow-none md:min-h-0 md:rounded-[32px] md:border-0 md:shadow-none"
                  interactive
                  onCoordinateChange={(latitude, longitude) =>
                    setForm((current) => ({
                      ...current,
                      latitude,
                      longitude
                    }))
                  }
                />
              </section>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="mx-3 inline-flex w-auto items-center justify-center gap-2 rounded-[20px] border border-[#f3c7b8]/70 bg-white px-4 py-3 text-sm font-black text-[#ff5a1f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 md:mx-0 md:rounded-[24px]"
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
                {locating ? "Detecting location..." : "Use Current Location"}
              </button>

              <div className="mx-3 rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(8,43,76,0.06)] md:mx-0 md:rounded-[32px] md:border md:border-[#eef1f5] md:shadow-none">
                <div className="grid gap-5">
                  <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                  Label
                    <Input
                      placeholder="Home, Office, Shop..."
                      value={form.label}
                      onChange={(event) => setForm({ ...form, label: event.target.value })}
                      className="rounded-[20px] border-[#f3d4c8] bg-white px-5 py-4 text-base"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                    Recipient name
                      <Input
                        placeholder="Tha Seyha"
                        value={form.recipientName}
                        onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
                        className="rounded-[20px] border-[#f3d4c8] bg-white px-5 py-4 text-base"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                    Recipient phone
                      <Input
                        placeholder="855077322921"
                        value={form.recipientPhone}
                        onChange={(event) => setForm({ ...form, recipientPhone: event.target.value })}
                        className="rounded-[20px] border-[#f3d4c8] bg-white px-5 py-4 text-base"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                    Province
                    <select
                      value={form.province}
                      onChange={(event) => setForm({ ...form, province: event.target.value })}
                      className="focus-ring h-14 w-full rounded-[20px] border border-[#f3d4c8] bg-white px-5 text-base font-semibold text-[#082b4c] outline-none transition"
                    >
                      <option value="">Select province</option>
                      {CAMBODIA_PROVINCES.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-bold text-[#082b4c]">
                    Address
                    <Textarea
                      placeholder="Street, house number, village, commune..."
                      value={form.address}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                      className="min-h-36 rounded-[20px] border-[#f3d4c8] bg-white px-5 py-4 text-base"
                    />
                  </label>

                  <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[20px] border px-4 text-sm font-black transition ${form.isDefault ? "border-[#ffb29b] bg-[#fff4ef] text-[#082b4c]" : "border-neutral-200 bg-white text-neutral-500"}`}>
                    <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} className="sr-only" />
                    <CheckCircle2 size={18} />
                    Set as default checkout address
                  </label>
                </div>
              </div>

              <div className="mx-3 mt-1 grid gap-3 md:mx-0 md:flex md:justify-end">
                <Button disabled={saving} className="h-14 rounded-[22px] bg-[#ff5a1f] px-6 text-base hover:bg-[#ef4e14] md:min-w-[220px]">
                  {editingId ? "Update Address" : "Save Address"}
                </Button>
                <button type="button" onClick={resetForm} className="h-12 rounded-[20px] border border-neutral-200 bg-white px-5 text-sm font-black text-[#082b4c] md:h-14">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
