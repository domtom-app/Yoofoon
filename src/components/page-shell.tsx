import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { MainMenu } from "@/components/main-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/wordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getUnreadCount } from "@/lib/notifications";
import { photoBaseUrl } from "@/lib/voting-data";

async function Menu() {
  let phone: string | null = null;
  let admin = false;
  let avatarUrl: string | null = null;
  let phonePublic = false;
  let unread = 0;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await connection();
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const raw = data?.claims?.phone;
    if (raw) phone = `0${raw.replace(/^\+?20/, "")}`;
    const meta = data?.claims?.app_metadata as { role?: string } | undefined;
    admin = meta?.role === "admin";
    if (data?.claims?.sub) {
      try {
        const [profile, count] = await Promise.all([getProfile(data.claims.sub), getUnreadCount(data.claims.sub)]);
        unread = count;
        phonePublic = Boolean(profile?.phone_public);
        if (profile?.avatar_path) avatarUrl = `${photoBaseUrl()}/${profile.avatar_path}`;
      } catch {
        avatarUrl = null;
      }
    }
  }
  return (
    <MainMenu
      phone={phonePublic ? phone : null}
      signedIn={Boolean(phone)}
      admin={admin}
      avatarUrl={avatarUrl}
      unread={unread}
    />
  );
}

export async function getVisitorCount(): Promise<number | null> {
  try {
    const { count, error } = await createAdminClient()
      .from("visitors")
      .select("device_id", { count: "exact" })
      .limit(1);
    return error ? null : count;
  } catch {
    return null;
  }
}

export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-96 rounded-3xl" />
      ))}
    </div>
  );
}

export function PageShell({ children, back }: { children: ReactNode; back?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3">
      <header className="grid h-20 grid-cols-3 items-center">
        <Suspense fallback={<Skeleton className="size-11 rounded-full" />}>
          <Menu />
        </Suspense>
        <Wordmark className="justify-self-center text-3xl text-primary" />
        {back && <div className="justify-self-end">{back}</div>}
      </header>
      <main className="flex-1 pb-10 pt-2">
        <Suspense fallback={<CardsSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}
