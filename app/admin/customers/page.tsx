"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MapPinned, Phone, Plus, ShoppingBag, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { useToastStore } from "@/lib/toast-store";

type CustomerUser = {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  role: string;
  createdAt: string;
  _count?: {
    customerOrders?: number;
  };
  customerOrders?: Array<{
    id: string;
    customerName: string;
    phone: string;
    address: string;
    province?: string | null;
    paymentMethod: string;
    status: string;
    total: string | number;
    createdAt: string;
  }>;
};

export default function AdminCustomersPage() {
  const token = useAuthStore((state) => state.token);
  const toast = useToastStore((state) => state.push);
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const load = useCallback(() => {
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/users?role=CUSTOMER", { headers })
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function latestOrder(user: CustomerUser) {
    return user.customerOrders?.[0] || null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...form, role: "CUSTOMER" })
    });
    if (!response.ok) return toast("Could not add customer", "error");
    toast("Customer added");
    setForm({ name: "", email: "", password: "" });
    setFormOpen(false);
    load();
  }

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">People</p>
        <h1 className="text-4xl font-black text-[#15130f]">Customers</h1>
        <p className="mt-2 text-sm text-neutral-500">Display customer account details with their latest order information for quick admin lookup.</p>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex h-12 items-center gap-2 rounded-2xl bg-[#15130f] px-5 text-sm font-black text-white hover:bg-[#2b261d]"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#15130f]/35 px-4 backdrop-blur-sm">
          <form onSubmit={submit} className="admin-card w-full max-w-xl rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#e0a900]">Customer Form</p>
                <h2 className="text-2xl font-black text-[#15130f]">Add Customer</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#fbfaf7] text-[#15130f]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Name
                <Input required placeholder="Customer name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Email
                <Input required type="email" placeholder="customer@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#15130f]">
                Password
                <Input type="password" placeholder="Default: staff123" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </label>
              <Button className="h-12 rounded-2xl">Add customer</Button>
            </div>
          </form>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="admin-card rounded-[26px] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e9897e]">Total Customers</p>
          <p className="mt-3 text-4xl font-black text-[#15130f]">{users.length}</p>
          <p className="mt-2 text-sm text-neutral-500">Registered customer accounts in the system.</p>
        </div>
        <div className="admin-card rounded-[26px] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e9897e]">With Orders</p>
          <p className="mt-3 text-4xl font-black text-[#15130f]">{users.filter((user) => (user._count?.customerOrders || 0) > 0).length}</p>
          <p className="mt-2 text-sm text-neutral-500">Customers who already placed at least one order.</p>
        </div>
        <div className="admin-card rounded-[26px] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e9897e]">No Orders Yet</p>
          <p className="mt-3 text-4xl font-black text-[#15130f]">{users.filter((user) => (user._count?.customerOrders || 0) === 0).length}</p>
          <p className="mt-2 text-sm text-neutral-500">Accounts that have not checked out yet.</p>
        </div>
      </section>

      <section className="grid gap-4">
        {users.map((user) => {
          const order = latestOrder(user);
          const orderCount = user._count?.customerOrders || 0;
          return (
            <article key={user.id} className="admin-card rounded-[28px] p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div>
                  <div className="flex flex-wrap items-start gap-4">
                    <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-[#ffdc1f] text-[#15130f]">
                      <UserRound size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-[#15130f]">{user.name}</h2>
                        <span className="rounded-full bg-[#fff5c4] px-3 py-1 text-xs font-black text-[#15130f]">{user.role}</span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500">@{user.username || "customer"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#fbfaf7] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9897e]">Contact</p>
                      <div className="mt-3 grid gap-2 text-sm text-[#15130f]">
                        <p className="flex items-center gap-2"><Mail size={15} className="text-neutral-400" /> {user.email || "No email"}</p>
                        <p className="flex items-center gap-2"><Phone size={15} className="text-neutral-400" /> {user.phone || order?.phone || "No phone"}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[#fbfaf7] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9897e]">Account</p>
                      <div className="mt-3 grid gap-2 text-sm text-[#15130f]">
                        <p>Joined: <span className="font-bold text-neutral-500">{new Date(user.createdAt).toLocaleDateString()}</span></p>
                        <p>Orders: <span className="font-bold text-neutral-500">{orderCount}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#f3c7b8]/70 bg-[linear-gradient(180deg,#fffdfb_0%,#fbfaf7_100%)] p-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#e9897e]" />
                    <h3 className="text-lg font-black text-[#15130f]">Latest Order Info</h3>
                  </div>
                  {order ? (
                    <div className="mt-4 grid gap-3 text-sm">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9897e]">Shipping Name</p>
                        <p className="mt-2 font-black text-[#15130f]">{order.customerName}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="flex items-start gap-2 text-[#15130f]">
                          <MapPinned size={15} className="mt-0.5 text-neutral-400" />
                          <span>{order.address}{order.province ? `, ${order.province}` : ""}</span>
                        </p>
                        <p className="mt-3 text-neutral-500">Payment: <span className="font-bold text-[#15130f]">{order.paymentMethod}</span></p>
                        <p className="mt-1 text-neutral-500">Status: <span className="font-bold text-[#15130f]">{order.status}</span></p>
                        <p className="mt-1 text-neutral-500">Placed: <span className="font-bold text-[#15130f]">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white p-5 text-sm text-neutral-500 shadow-sm">
                      This customer has no order information yet.
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="admin-card overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#15130f]">Customer List</h2>
            <p className="mt-1 text-sm text-neutral-500">{users.length} customers showing with contact and latest order summary</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[#fbfaf7] text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Orders</th>
                <th className="px-5 py-4">Latest address</th>
                <th className="px-5 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user, index) => (
                <tr key={user.id} className="transition hover:bg-[#fffdf8]">
                  <td className="px-5 py-4 text-sm font-black text-[#15130f]">{index + 1}</td>
                  <td className="px-5 py-4">
                    <p className="font-black text-[#15130f]">{user.name}</p>
                    <p className="text-sm text-neutral-500">@{user.username || "customer"}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-500">{user.phone || user.customerOrders?.[0]?.phone || "-"}</td>
                  <td className="px-5 py-4 text-sm text-neutral-500">{user.email || "-"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-[#15130f]">{user._count?.customerOrders || 0}</td>
                  <td className="px-5 py-4 text-sm text-neutral-500">{user.customerOrders?.[0]?.address || "-"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && <p className="px-5 py-6 text-sm text-neutral-500">No customers yet.</p>}
      </section>
    </div>
  );
}
