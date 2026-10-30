import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_HEADINGS } from "@/lib/voting";

export type Settings = {
  votingStartsAt: Date | null;
  votingEndsAt: Date | null;
  parliamentStartsAt: Date | null;
  parliamentEndsAt: Date | null;
  votingHeading: string;
  parliamentHeading: string;
  votingPublished: boolean;
  parliamentPublished: boolean;
};

const date = (v: string | null) => (v ? new Date(v) : null);

export const DEFAULT_TIPS_HEADING = "فيد واستفيد";

// Read separately so a missing column never affects the voting settings.
export async function getTipsHeading(): Promise<string> {
  try {
    const { data } = await createAdminClient()
      .from("site_settings")
      .select("tips_heading")
      .eq("id", 1)
      .maybeSingle();
    return data?.tips_heading || DEFAULT_TIPS_HEADING;
  } catch {
    return DEFAULT_TIPS_HEADING;
  }
}

// Returns null when the settings are unavailable so callers can fall back to open voting.
export async function getSettings(): Promise<Settings | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("site_settings")
      .select(
        "voting_starts_at, voting_ends_at, parliament_starts_at, parliament_ends_at, voting_heading, parliament_heading, voting_published, parliament_published",
      )
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      votingStartsAt: date(data.voting_starts_at),
      votingEndsAt: date(data.voting_ends_at),
      parliamentStartsAt: date(data.parliament_starts_at),
      parliamentEndsAt: date(data.parliament_ends_at),
      votingHeading: data.voting_heading || DEFAULT_HEADINGS.president,
      parliamentHeading: data.parliament_heading || DEFAULT_HEADINGS.parliament,
      votingPublished: data.voting_published,
      parliamentPublished: data.parliament_published,
    };
  } catch {
    return null;
  }
}
