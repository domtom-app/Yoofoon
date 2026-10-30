import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { BackButton } from "@/components/back-button";
import { z } from "zod";
import { AdvertiserManager } from "@/components/advertiser-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/wordmark";
import { isAdmin } from "@/lib/admin-auth";
import { getAdvertiserManage } from "@/lib/tips-data";

export const metadata = { title: "إدارة المعلن" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!(await isAdmin())) redirect("/");
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getAdvertiserManage(id.data);
  if (!data) notFound();
  return <AdvertiserManager data={data} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
      <header className="grid h-20 grid-cols-3 items-center">
        <span />
        <Wordmark className="justify-self-center text-3xl text-primary" />
        <div className="justify-self-end">
          <BackButton fallback="/admin" />
        </div>
      </header>
      <main className="flex-1 pb-10 pt-2">
        <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
          <Content params={params} />
        </Suspense>
      </main>
    </div>
  );
}
