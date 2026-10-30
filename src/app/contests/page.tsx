import { connection } from "next/server";
import { BackButton } from "@/components/back-button";
import { ContestsSection } from "@/components/contests-section";
import { PageShell } from "@/components/page-shell";
import { getContests } from "@/lib/contests-data";

export const metadata = { title: "الاستفتاءات" };

async function Contests() {
  await connection();
  return <ContestsSection data={await getContests()} />;
}

export default function Page() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <Contests />
    </PageShell>
  );
}
