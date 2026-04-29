"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

export default function AdminStaffPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [staff, setStaff] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", commissionRate: "" });
  const [formOpen, setFormOpen] = useState(false);

  function load() {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/users?role=STAFF", { headers })
      .then((r) => r.json())
      .then((data) => setStaff(data.users || []));
    fetch("/api/orders", { headers })
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]));
  }

  useEffect(load, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...form, role: "STAFF" })
    });
    if (!response.ok) return toast("Could not add staff", "error");
    toast("Staff added");
    setForm({ name: "", email: "", password: "", commissionRate: "" });
    setFormOpen(false);
    load();
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">People</p>
        <h1 className="text-4xl font-black text-[#15130f]">Staff Management</h1>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setForm({ name: "", email: "", password: "", commissionRate: "" });
            setFormOpen(true);
          }}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white hover:bg-[#2b261d]"
        >
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card w-full max-w-xl rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Staff Form</p>
                <h2 className="text-2xl font-black text-[#15130f]">Add Staff</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Name
                <Input required placeholder="Staff name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Email
                <Input required type="email" placeholder="staff@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Password
                <Input type="password" placeholder="Default: staff123" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Commission %
                <Input type="number" placeholder="0" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
              </label>
              <Button className="h-12 rounded-2xl">Add staff</Button>
            </div>
          </form>
        </div>
      )}

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Staff List</h2>
            <p className="mt-1 text-sm text-neutral-500">{staff.length} staff showing</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Staff</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Commission</th>
                <th className="px-5 py-4">Completed Sales</th>
                <th className="px-5 py-4">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {staff.map((user, index) => {
                const completedSales = orders.filter((order) => order.staffId === user.id && order.status === "COMPLETED");
                const revenue = completedSales.reduce((sum, order) => sum + Number(order.total), 0);
                return (
                  <tr key={user.id} className="transition hover:bg-[#fffdf8]">
                    <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                    <td className="px-5 py-4">
                      <p className="font-black text-[#15130f]">{user.name}</p>
                      <p className="text-sm text-neutral-500">{user.role}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-neutral-500">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#fff5c4] px-3 py-1 text-xs font-black text-[#15130f]">{user.commissionRate}%</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-neutral-500">{completedSales.length}</td>
                    <td className="px-5 py-4 font-black text-[#15130f]">${revenue.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!staff.length && <p className="px-5 py-6 text-sm text-neutral-500">No staff yet.</p>}
      </section>
    </div>
  );
}
