import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { AdvertiserHeader } from "@/components/advertiser-header";
import { AdvertCard } from "@/components/advert-card";
import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { getNominatorAt } from "@/lib/gifts-data";
import { getSessionUser } from "@/lib/profile";
import { getAdvertiser, getOwnerTips } from "@/lib/tips-data";

export const metadata = { title: "ملف المهتم" };

const formatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

async function Nominee({ params }: { params: Promise<{ tipId: string; userId: string }> }) {
  await connection();
  const p = await params;
  const tipId = z.string().uuid().safeParse(p.tipId);
  const userId = z.string().uuid().safeParse(p.userId);
  if (!tipId.success || !userId.success) notFound();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const at = await getNominatorAt(user.id, tipId.data, userId.data);
  if (!at) notFound();
  const [nominee, { tips, mine, account }] = await Promise.all([getAdvertiser(userId.data), getOwnerTips(userId.data)]);

  return (
    <div className="mx-auto -mt-3 flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-center text-base font-bold leading-[1.5]">ملف المهتم</h1>
      <AdvertiserHeader advertiser={nominee} />
      <p className="text-center text-sm text-muted-foreground">أبدى اهتمامه بإعلانك {formatter.format(new Date(at))}</p>
      {tips.map((t) => (
        <AdvertCard key={t.id} tip={t} mine={mine.includes(t.id)} account={account} full />
      ))}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ tipId: string; userId: string }> }) {
  return (
    <PageShell back={<BackButton fallback="/profile" />}>
      <Nominee params={params} />
    </PageShell>
  );
}
