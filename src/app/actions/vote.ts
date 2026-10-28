"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";
import { DEVICE_COOKIE, DISTRICT_COOKIE, homeDistrictId } from "@/lib/voting-data";
import { saveUserDistrict } from "@/app/actions/profile";
import { getSessionUser } from "@/lib/profile";
import { windowStatus } from "@/lib/voting";

export type VoteState = { error?: string; done?: boolean; redirectTo?: string };

const idSchema = z.string().uuid();

type Target = {
  field: string;
  path: string;
  votesTable: "votes" | "member_votes";
  fk: "candidate_id" | "member_id";
  targetTable: "candidates" | "members";
  onlyActive: boolean;
};

async function cast(formData: FormData, t: Target): Promise<VoteState> {
  const parsed = idSchema.safeParse(formData.get(t.field));
  if (!parsed.success) return { error: "اختيار غير صالح" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await checkRateLimit(`vote:${ip}`))) {
    return { error: "محاولات كثيرة، انتظر قليلًا" };
  }

  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  const deviceId = idSchema.safeParse(existing).success ? existing! : randomUUID();

  try {
    const admin = createAdminClient();
    const user = await getSessionUser();

    let lookup = admin.from(t.targetTable).select("id").eq("id", parsed.data);
    if (t.onlyActive) lookup = lookup.eq("active", true);
    const { data: target } = await lookup.maybeSingle();
    if (!target) return { error: "غير موجود" };

    const { error } = await admin
      .from(t.votesTable)
      .insert({ [t.fk]: target.id, device_id: deviceId, user_id: user?.id ?? null });

    if (error) {
      return {
        error:
          error.code === "23505"
            ? user
              ? "صوّتَّ من قبل"
              : "صوّتَّ من هذا الجهاز من قبل"
            : "تعذّر التصويت",
      };
    }
  } catch {
    return { error: "تعذّر التصويت" };
  }

  jar.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
  revalidatePath(t.path);
  // Signed-in voters continue to their profile, where the vote can be shared.
  return (await getSessionUser()) ? { done: true, redirectTo: "/profile" } : { done: true };
}

export async function vote(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const settings = await getSettings();
  if (settings && !settings.votingPublished) return { error: "التصويت غير متاح" };
  const status = windowStatus(
    settings?.votingStartsAt ?? null,
    settings?.votingEndsAt ?? null,
    new Date(),
  );
  if (status === "upcoming") return { error: "لم يبدأ التصويت" };
  if (status === "closed") return { error: "انتهى التصويت" };
  return cast(formData, {
    field: "candidateId",
    path: "/",
    votesTable: "votes",
    fk: "candidate_id",
    targetTable: "candidates",
    onlyActive: true,
  });
}

export async function voteMember(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const settings = await getSettings();
  if (settings && !settings.parliamentPublished) return { error: "التصويت غير متاح" };
  const status = windowStatus(
    settings?.parliamentStartsAt ?? null,
    settings?.parliamentEndsAt ?? null,
    new Date(),
  );
  if (status === "upcoming") return { error: "لم يبدأ التصويت" };
  if (status === "closed") return { error: "انتهى التصويت" };

  if (!(await getSessionUser())) return { error: "سجّل الدخول أولًا" };
  const districtId = await homeDistrictId();
  const memberId = idSchema.safeParse(formData.get("candidateId"));
  if (!districtId) return { error: "اختر دائرتك أولًا" };
  if (!memberId.success) return { error: "اختيار غير صالح" };
  try {
    const { data } = await createAdminClient()
      .from("members")
      .select("id")
      .eq("id", memberId.data)
      .eq("district_id", districtId)
      .maybeSingle();
    if (!data) return { error: "هذا العضو ليس في دائرتك" };
  } catch {
    return { error: "تعذّر التصويت" };
  }

  return cast(formData, {
    field: "candidateId",
    path: "/parliament",
    votesTable: "member_votes",
    fk: "member_id",
    targetTable: "members",
    onlyActive: false,
  });
}

export async function chooseDistrict(districtId: string): Promise<VoteState> {
  if (await getSessionUser()) return saveUserDistrict(districtId);
  const id = idSchema.safeParse(districtId);
  if (!id.success) return { error: "اختيار غير صالح" };
  try {
    const { data } = await createAdminClient()
      .from("districts")
      .select("id")
      .eq("id", id.data)
      .maybeSingle();
    if (!data) return { error: "غير موجود" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  (await cookies()).set(DISTRICT_COOKIE, id.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
  revalidatePath("/parliament");
  return {};
}

export async function clearDistrict(): Promise<void> {
  (await cookies()).delete(DISTRICT_COOKIE);
  revalidatePath("/parliament");
}
