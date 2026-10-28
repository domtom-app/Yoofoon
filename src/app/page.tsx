import { connection } from "next/server";
import { vote } from "@/app/actions/vote";
import { CandidateCards } from "@/components/candidate-cards";
import { Winners } from "@/components/home-sections";
import { Tips } from "@/components/tips-block";
import { getVisitorCount, PageShell } from "@/components/page-shell";
import { VisitorCount } from "@/components/visitor-count";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/profile";
import { DEFAULT_HEADINGS, phaseOf, topCandidates } from "@/lib/voting";
import { getVotingData } from "@/lib/voting-data";

async function Home() {
  await connection();
  const [data, visitors, settings, user] = await Promise.all([
    getVotingData(),
    getVisitorCount(),
    getSettings(),
    getSessionUser(),
  ]);

  if (!data.ok) {
    return <p className="py-20 text-center text-muted-foreground">تعذّر التحميل</p>;
  }

  let phase = phaseOf(
    settings?.votingStartsAt ?? null,
    settings?.votingEndsAt ?? null,
    new Date(),
  );
  const winners = topCandidates(data.candidates);
  if (settings && !settings.votingPublished) phase = "announcement";
  else if (phase === "winner" && winners.length === 0) phase = "announcement";

  return (
    <>
      {phase !== "announcement" && (
        <p className="mb-3 truncate text-center text-base font-bold leading-[1.5]">
          {settings?.votingHeading ?? DEFAULT_HEADINGS.president}
        </p>
      )}
      <VisitorCount initial={visitors} />
      {(phase === "voting" || phase === "upcoming") &&
        (data.candidates.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">لا يوجد مرشحون</p>
        ) : (
          <CandidateCards
            candidates={data.candidates}
            votedId={data.votedId}
            voteAction={vote}
            account={Boolean(user)}
            status={phase === "upcoming" ? "upcoming" : "open"}
            startsAt={settings?.votingStartsAt?.toISOString() ?? null}
            endsAt={settings?.votingEndsAt?.toISOString() ?? null}
          />
        ))}
      {phase === "winner" && <Winners winners={winners} />}
      {phase === "announcement" && <Tips limit={20} heading={false} />}
    </>
  );
}

export default function HomePage() {
  return (
    <PageShell>
      <Home />
    </PageShell>
  );
}
