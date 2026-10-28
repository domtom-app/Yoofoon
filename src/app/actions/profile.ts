"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parsePhoto, removePhoto, uploadPhoto } from "@/lib/admin-storage";
import { isEgyptPhone, normalizeDigits, toE164 } from "@/lib/phone";
import { getProfile, getSessionUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { daysUntilChange } from "@/lib/voting";

export type ProfileState = { error?: string };

const idSchema = z.string().uuid();

// The phone is the login identifier, so the current password is required to change it.
export async function changePhone(newPhone: string, password: string): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user?.phone) return { error: "سجّل الدخول أولًا" };

  const phone = normalizeDigits(newPhone);
  if (!isEgyptPhone(phone)) return { error: "رقم هاتف مصري من 11 رقمًا" };
  if (phone === user.phone) return { error: "هذا رقمك الحالي" };
  if (password.length < 6 || password.length > 72) return { error: "كلمة المرور غير صحيحة" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await checkRateLimit(`phone:${user.id}:${ip}`))) {
    return { error: "محاولات كثيرة، انتظر قليلًا" };
  }

  try {
    const verifier = createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: authError } = await verifier.auth.signInWithPassword({
      phone: toE164(user.phone),
      password,
    });
    if (authError) return { error: "كلمة المرور غير صحيحة" };

    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
      phone: toE164(phone),
      phone_confirm: true,
    });
    if (error) {
      return {
        error: error.code === "phone_exists" ? "الرقم مسجل بحساب آخر" : "تعذّر تغيير الرقم",
      };
    }

    await (await createClient()).auth.refreshSession();
  } catch {
    return { error: "تعذّر تغيير الرقم" };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function saveUserDistrict(districtId: string): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const id = idSchema.safeParse(districtId);
  if (!id.success) return { error: "اختيار غير صالح" };

  try {
    const admin = createAdminClient();
    const profile = await getProfile(user.id);
    if (profile?.district_id === id.data) return {};

    const days = daysUntilChange(profile?.district_changed_at, new Date());
    if (profile?.district_id && days > 0) return { error: `يمكن التعديل بعد ${days} يوم` };

    const { data: district } = await admin.from("districts").select("id").eq("id", id.data).maybeSingle();
    if (!district) return { error: "غير موجود" };

    const { error } = await admin
      .from("profiles")
      .upsert({ user_id: user.id, district_id: id.data, district_changed_at: new Date().toISOString() });
    if (error) return { error: "تعذّر الحفظ" };
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  revalidatePath("/profile");
  revalidatePath("/parliament");
  return {};
}

export async function saveAvatar(formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  const photo = parsePhoto(formData.get("photo"));
  if (!photo) return { error: "اختر صورة" };
  if (photo === "invalid") return { error: "صورة غير صالحة (حتى 4MB)" };

  let path: string | null = null;
  try {
    const profile = await getProfile(user.id);
    path = await uploadPhoto(photo, "avatars/");
    const { error } = await createAdminClient()
      .from("profiles")
      .upsert({ user_id: user.id, avatar_path: path });
    if (error) throw error;
    await removePhoto(profile?.avatar_path);
  } catch {
    await removePhoto(path);
    return { error: "تعذّر رفع الصورة" };
  }
  revalidatePath("/profile");
  return {};
}

export async function savePhonePublic(value: boolean): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "سجّل الدخول أولًا" };
  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .upsert({ user_id: user.id, phone_public: z.boolean().parse(value) });
    if (error) throw error;
  } catch {
    return { error: "تعذّر الحفظ" };
  }
  revalidatePath("/", "layout");
  return {};
}
