import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { AdminPanel } from "@/components/admin-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/wordmark";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminData } from "@/lib/admin-data";

async function Content({ params }: { params: Promise<{ tab?: string; status?: string }> }) {
  if (!(await isAdmin())) redirect("/");
  const [data, { tab, status }] = await Promise.all([getAdminData(), params]);
  if (!data) {
    return <p className="py-20 text-center text-muted-foreground">تعذّر التحميل</p>;
  }
  return <AdminPanel data={data} initialTab={tab === "tips" ? "tips" : undefined} initialStatus={status === "pending" ? "pending" : undefined} />;
}

export default function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
      <header className="grid h-20 grid-cols-3 items-center">
        <span />
        <Wordmark className="justify-self-center text-3xl text-primary" />
        <div className="justify-self-end">
          <BackButton fallback="/" />
        </div>
      </header>
      <main className="flex-1 pb-10 pt-2">
        <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
          <Content params={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
