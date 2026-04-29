"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPinned, Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";
import { DeliveryZone } from "@/lib/types";
import { money } from "@/lib/format";

const empty = { name: "", price: "", freeDeliveryAmount: "", isActive: true };

export default function AdminDeliveryPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const headers = useCallback((): HeadersInit => {
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, [token]);

  const load = useCallback(() => {
    fetch("/api/delivery-zones?all=true", { headers: headers() })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setZones(data.zones || []))
      .catch(() => setZones([]));
  }, [headers]);

  useEffect(load, [load]);

  function resetForm() {
    setForm(empty);
    setEditing(null);
  }

  function openEdit(zone: DeliveryZone) {
    setEditing(zone.id);
    setForm({
      name: zone.name,
      price: String(zone.price),
      freeDeliveryAmount: zone.freeDeliveryAmount ? String(zone.freeDeliveryAmount) : "",
      isActive: Boolean(zone.isActive)
    });
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(editing ? `/api/delivery-zones/${editing}` : "/api/delivery-zones", {
      method: editing ? "PUT" : "POST",
      headers: headers(),
      body: JSON.stringify({ ...form, freeDeliveryAmount: form.freeDeliveryAmount || null })
    });

    if (!response.ok) return toast("Could not save delivery zone", "error");
    toast(editing ? "Delivery zone updated" : "Delivery zone added");
    resetForm();
    setFormOpen(false);
    load();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/delivery-zones/${id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) return toast("Could not delete delivery zone", "error");
    toast("Delivery zone deleted");
    load();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Operations</p>
          <h1 className="text-4xl font-black text-[#15130f]">Delivery Settings</h1>
          <p className="mt-2 text-sm text-neutral-500">Set delivery price, free delivery amount, and active zones.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white transition hover:bg-[#2b261d]"
        >
          <Plus size={18} />
          Add Delivery Zone
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="admin-card rounded-[22px] p-5">
          <MapPinned className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Total zones</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{zones.length}</p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <Truck className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Active zones</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">{zones.filter((zone) => zone.isActive).length}</p>
        </div>
        <div className="admin-card rounded-[22px] p-5">
          <Truck className="text-[#e0a900]" size={23} />
          <p className="mt-4 text-sm font-black text-neutral-400">Default lowest price</p>
          <p className="mt-1 text-3xl font-black text-[#15130f]">
            {zones.length ? money(Math.min(...zones.map((zone) => Number(zone.price || 0)))) : "$0.00"}
          </p>
        </div>
      </div>

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">Zone</th>
                <th className="px-5 py-4">Delivery price</th>
                <th className="px-5 py-4">Free from</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {zones.map((zone) => (
                <tr key={zone.id} className="transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4">
                    <p className="font-black text-[#15130f]">{zone.name}</p>
                  </td>
                  <td className="px-5 py-4 font-black text-[#15130f]">{money(zone.price)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-500">
                    {zone.freeDeliveryAmount ? money(zone.freeDeliveryAmount) : "No free threshold"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${zone.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(zone)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                        <Pencil size={17} />
                      </button>
                      <button type="button" onClick={() => remove(zone.id)} className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!zones.length && <p className="px-5 py-6 text-sm text-neutral-500">No delivery zones yet.</p>}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card w-full max-w-xl rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Delivery Zone</p>
                <h2 className="text-2xl font-black text-[#15130f]">{editing ? "Edit Zone" : "Add Zone"}</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Province / City
                <Input required placeholder="Phnom Penh" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Delivery price
                <Input required type="number" min="0" step="0.01" placeholder="1.50" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Free delivery amount
                <Input type="number" min="0" step="0.01" placeholder="50.00" value={form.freeDeliveryAmount} onChange={(event) => setForm({ ...form, freeDeliveryAmount: event.target.value })} />
              </label>
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${form.isActive ? "border-[#ffdc1f] bg-[#fff5c4] text-[#15130f]" : "border-neutral-200 bg-white text-neutral-500"}`}>
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="sr-only" />
                <Truck size={18} />
                Enable delivery zone
              </label>
              <Button className="h-12 rounded-2xl">{editing ? "Save Zone" : "Add Zone"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
