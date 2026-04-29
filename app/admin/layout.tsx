import { AdminShell } from "@/components/admin-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("token")?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) redirect("/login");
  if (payload.role === "CUSTOMER") redirect("/");

  return <AdminShell>{children}</AdminShell>;
}
