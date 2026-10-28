import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { Tips } from "@/components/tips-block";

export const metadata = { title: "فيد واستفيد" };

async function TipsPage() {
  await connection();
  return <Tips />;
}

export default function Page() {
  return (
    <PageShell>
      <TipsPage />
    </PageShell>
  );
}
