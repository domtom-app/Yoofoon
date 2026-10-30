"use client";

import Link from "next/link";
import { useState, useTransition, type ComponentType } from "react";
import { Ban, Bell, CheckCheck, Clock, EyeOff, Flag, Gift, Heart, Megaphone, ShieldCheck, Trash2 } from "lucide-react";
import { dismissNotifications, markNotificationRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import type { MyNotification } from "@/lib/notifications";

const formatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

type Kind = { Icon: ComponentType<{ className?: string }>; tone: string };

const KINDS: [RegExp, Kind][] = [
  [/تم رفع الإيقاف/, { Icon: ShieldCheck, tone: "bg-primary/15 text-primary" }],
  [/تم تطبيق/, { Icon: Ban, tone: "bg-destructive/15 text-destructive" }],
  [/تم حذف/, { Icon: Trash2, tone: "bg-destructive/15 text-destructive" }],
  [/تم إيقاف نشر/, { Icon: EyeOff, tone: "bg-amber-500/15 text-amber-600" }],
  [/تمت الموافقة/, { Icon: ShieldCheck, tone: "bg-primary/15 text-primary" }],
  [/مهتم/, { Icon: Heart, tone: "bg-rose-500/15 text-rose-500" }],
  [/هدية|الهدية/, { Icon: Gift, tone: "bg-violet-500/15 text-violet-500" }],
  [/بلاغ/, { Icon: Flag, tone: "bg-amber-500/15 text-amber-600" }],
  [/بانتظار|ينتهي|انتهى/, { Icon: Clock, tone: "bg-sky-500/15 text-sky-600" }],
  [/إعلان/, { Icon: Megaphone, tone: "bg-primary/15 text-primary" }],
];

function kindOf(message: string): Kind {
  return KINDS.find(([re]) => re.test(message))?.[1] ?? { Icon: Bell, tone: "bg-secondary text-muted-foreground" };
}

export function NotificationList({ items }: { items: MyNotification[] }) {
  const [pending, start] = useTransition();
  const [read, setRead] = useState<string[]>([]);
  const hasUnread = items.some((n) => n.unread && !read.includes(n.id));

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Bell className="size-8" />
        <p className="text-sm">لا توجد إشعارات</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      {hasUnread && (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => start(() => dismissNotifications())}
          className="h-10 gap-2 self-end rounded-xl text-sm font-bold"
        >
          <CheckCheck className="size-4" />
          تعليم الكل كمقروء
        </Button>
      )}
      {items.map((n) => {
        const unread = n.unread && !read.includes(n.id);
        const { Icon, tone } = kindOf(n.message);
        const body = (
          <>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="size-[18px]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={unread ? "text-sm font-bold leading-6" : "text-sm leading-6 text-muted-foreground"}>
                {n.message}
              </p>
              <p className="text-[11px] text-muted-foreground">{formatter.format(new Date(n.createdAt))}</p>
            </div>
          </>
        );
        const cls = `flex items-start gap-3 rounded-2xl border p-3 transition-colors ${unread ? "border-primary/40 bg-card" : "bg-secondary opacity-70"}`;
        const open = () => {
          if (!unread) return;
          setRead((r) => [...r, n.id]);
          start(() => markNotificationRead(n.id));
        };
        const go = n.id === "new-tips" ? n.href : /بانتظار المراجعة/.test(n.message) ? "/admin?tab=tips&status=pending" : /^فزت بهدية/.test(n.message) ? "/profile#gifts" : null;
        return go ? (
          <Link key={n.id} href={go} onClick={open} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={n.id} type="button" onClick={open} className={`${cls} w-full text-start`}>
            {body}
          </button>
        );
      })}
    </div>
  );
}
