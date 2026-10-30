import { BackButton } from "@/components/back-button";
import { connection } from "next/server";
import { ParliamentView } from "@/components/parliament-view";
import { getVisitorCount, PageShell } from "@/components/page-shell";
import { VisitorCount } from "@/components/visitor-count";
import { getParliamentData } from "@/lib/voting-data";
import { Tips } from "@/components/tips-block";
import { getSettings } from "@/lib/settings";
import { DEFAULT_HEADINGS, windowStatus } from "@/lib/voting";

export const metadata = { title: "ØªØµÙˆÙŠØª Ø§Ù„Ø¨Ø±Ù„Ù…Ø§Ù†" };

async function Parliament() {
  await connection();
  const [data, visitors, settings] = await Promise.all([
    getParliamentData(),
    getVisitorCount(),
    getSettings(),
  ]);

  if (!data.ok) {
    return <p className="py-20 text-center text-muted-foreground">ØªØ¹Ø°Ù‘Ø± Ø§Ù„ØªØ­Ù…ÙŠÙ„</p>;
  }

  if (settings && !settings.parliamentPublished) {
    return <Tips />;
  }

  const status = windowStatus(
    settings?.parliamentStartsAt ?? null,
    settings?.parliamentEndsAt ?? null,
    new Date(),
  );

  return (
    <>
      <p className="mb-3 truncate text-center text-base font-bold leading-[1.5]">
        {settings?.parliamentHeading ?? DEFAULT_HEADINGS.parliament}
      </p>
      <VisitorCount initial={visitors} />
      {data.districts.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙˆØ§Ø¦Ø±</p>
      ) : (
        <ParliamentView
          data={data}
          status={status}
          startsAt={settings?.parliamentStartsAt?.toISOString() ?? null}
          endsAt={settings?.parliamentEndsAt?.toISOString() ?? null}
        />
      )}
      <div className="mt-8">
        <Tips />
      </div>
    </>
  );
}

export default function ParliamentPage() {
  return (
    <PageShell back={<BackButton fallback="/" />}>
      <Parliament />
    </PageShell>
  );
}
