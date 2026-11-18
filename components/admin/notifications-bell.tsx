"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { getNotifications, markNotificationsRead, type AdminNotification } from "@/features/admin/notification-actions";
import { cn } from "@/lib/utils";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  if (m < 1440) return `לפני ${Math.round(m / 60)} שע׳`;
  return `לפני ${Math.round(m / 1440)} ימים`;
};

export function NotificationsBell() {
  const [data, setData] = React.useState<{ unread: number; items: AdminNotification[] }>({ unread: 0, items: [] });
  const [open, setOpen] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    const load = () => getNotifications().then((d) => alive && setData(d));
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("mousedown", close);
    };
  }, []);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && data.unread) {
            markNotificationsRead();
            setData((d) => ({ ...d, unread: 0 }));
          }
        }}
        className="relative grid size-10 place-items-center rounded-full hover:bg-sand"
        aria-label={`התראות${data.unread ? `, ${data.unread} חדשות` : ""}`}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {data.unread > 0 && (
          <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold text-white">{data.unread > 9 ? "9+" : data.unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <p className="border-b border-line px-4 py-3 text-sm font-bold">התראות</p>
          <ul className="max-h-96 overflow-y-auto">
            {data.items.map((n) => (
              <li key={n.id} className="border-b border-line last:border-0">
                <Link href={n.link ?? "/admin"} onClick={() => setOpen(false)} className={cn("block px-4 py-3 text-sm hover:bg-sand", !n.read_at && "bg-gold/10")}>
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="truncate text-ink-soft">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-ink-soft">{ago(n.created_at)}</p>
                </Link>
              </li>
            ))}
            {!data.items.length && <li className="px-4 py-8 text-center text-sm text-ink-soft">אין התראות</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
