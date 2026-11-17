import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: { default: "ניהול החנות", template: "%s · ניהול החנות" },
  robots: { index: false, follow: false },
};

async function Panel({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AdminShell email={admin.email} permissions={admin.permissions}>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}>{children}</Suspense>
    </AdminShell>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand/50" />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}
