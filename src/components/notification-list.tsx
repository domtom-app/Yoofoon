"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, X } from "lucide-react";
import { dismissNotifications } from "@/app/actions/notifications";
import type { MyNotification } from "@/lib/notifications";

export function NotificationList({ items }: { items: MyNotification[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return null;

  return (
    <div className="flex w-full flex-col gap-2 rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        <Bell className="size-5" />
        <p className="text-base font-bold leading-[1.5]">إشعارات</p>
        <button
          type="button"
          aria-label="إخفاء الإشعارات"
          disabled={pending}
          onClick={() => start(() => dismissNotifications())}
          className="ms-auto flex size-8 items-center justify-center rounded-full bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>
      {items.map((n) => {
        const text = <p className="text-sm leading-6">{n.message}</p>;
        return n.href ? (
          <Link key={n.id} href={n.href} className="rounded-2xl bg-secondary p-3">
            {text}
          </Link>
        ) : (
          <div key={n.id} className="rounded-2xl bg-secondary p-3">
            {text}
          </div>
        );
      })}
    </div>
  );
}
