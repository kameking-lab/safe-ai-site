import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasAdminPageAccess } from "@/lib/server/admin-access";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await hasAdminPageAccess())) notFound();
  return children;
}
