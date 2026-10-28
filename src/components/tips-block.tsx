import { TipsSection } from "@/components/tips-section";
import { getTips } from "@/lib/tips-data";

export async function Tips({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { tips, mine, account, places } = await getTips(limit);
  return <TipsSection tips={tips} mine={mine} account={account} places={places} heading={heading} />;
}
