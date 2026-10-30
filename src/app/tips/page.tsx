import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { Tips } from "@/components/tips-block";
import { BackButton } from "@/components/back-button";
import { getSessionUser } from "@/lib/profile";
import { markTipsSeen } from "@/lib/notifications";

export const metadata = { title: "فيد واستفيد" };

async function TipsPage() {
  await connection();
  const user = await getSessionUser();
  if (user) await markTipsSeen(user.id);
  return <Tips />;
}

export default function Page() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <TipsPage />
    </PageShell>
  );
}
