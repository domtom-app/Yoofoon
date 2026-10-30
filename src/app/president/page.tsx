import { BackButton } from "@/components/back-button";
import { PageShell } from "@/components/page-shell";
import { PresidentHome } from "@/components/president-home";

export const metadata = { title: "تصويت الرئاسة" };

export default function PresidentPage() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <PresidentHome />
    </PageShell>
  );
}
