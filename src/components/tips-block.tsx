import { TipsSection } from "@/components/tips-section";
import { getTipsHeading } from "@/lib/settings";
import { getTips } from "@/lib/tips-data";

export async function Tips({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const [{ tips, mine, account, places, blocked }, title] = await Promise.all([
    getTips(limit),
    heading ? getTipsHeading() : Promise.resolve(undefined),
  ]);
  return (
    <TipsSection tips={tips} mine={mine} account={account} places={places} heading={heading} title={title} blocked={blocked} />
  );
}
