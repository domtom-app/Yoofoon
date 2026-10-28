import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { AdvertCard } from "@/components/advert-card";
import { AdvertiserHeader } from "@/components/advertiser-header";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { getAdvertiser, getOwnerTips, getTipOwner } from "@/lib/tips-data";

export const metadata = { title: "إعلانات المعلن" };

async function Advertiser({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const owner = await getTipOwner(id.data);
  if (!owner) notFound();

  const [{ tips, mine, account }, advertiser] = await Promise.all([
    getOwnerTips(owner),
    getAdvertiser(owner),
  ]);
  if (tips.length === 0) notFound();

  return (
    <div className="mx-auto -mt-3 flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-center text-base font-bold leading-[1.5]">إعلانات المعلن</h1>
      <AdvertiserHeader advertiser={advertiser} />
      {tips.map((t) => (
        <AdvertCard key={t.id} tip={t} mine={mine.includes(t.id)} account={account} />
      ))}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageShell back={<BackButton fallback="/tips" />}>
      <Advertiser params={params} />
    </PageShell>
  );
}
