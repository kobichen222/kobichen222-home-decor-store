"use server";
import { getAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminNotification = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export async function getNotifications(): Promise<{ unread: number; items: AdminNotification[] }> {
  if (!(await getAdmin())) return { unread: 0, items: [] };
  const db = await createSessionClient();
  const { data } = await db.rpc("my_notifications", { p_limit: 15 });
  return (data as unknown as { unread: number; items: AdminNotification[] }) ?? { unread: 0, items: [] };
}

export async function markNotificationsRead(): Promise<void> {
  if (!(await getAdmin())) return;
  const db = await createSessionClient();
  await db.rpc("mark_notifications_read");
}
