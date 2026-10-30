import { PageShell } from "@/components/page-shell";
import { PresidentHome } from "@/components/president-home";

export default function HomePage() {
  return (
    <PageShell>
      <PresidentHome adsAfterVote />
    </PageShell>
  );
}
