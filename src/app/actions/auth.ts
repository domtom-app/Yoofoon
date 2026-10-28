"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/phone";
import { checkRateLimit } from "@/lib/ratelimit";
import { authSchema, type AuthFieldErrors } from "@/lib/validation/auth";

export type AuthState = {
  error?: string;
  fields?: AuthFieldErrors;
  phone?: string;
};

export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const raw = {
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = authSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      phone: raw.phone,
      fields: { phone: flat.phone?.[0], password: flat.password?.[0] },
    };
  }
  const { phone, password } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await checkRateLimit(`auth:${ip}`))) {
    return { phone, error: "محاولات كثيرة، انتظر قليلًا" };
  }

  const supabase = await createClient();
  const e164 = toE164(phone);

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ phone: e164, password });
    if (error) {
      return {
        phone,
        error:
          error.code === "user_already_exists"
            ? "الرقم مسجل بالفعل"
            : "تعذّر إنشاء الحساب",
      };
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ phone: e164, password });
  if (error) {
    return {
      phone,
      error:
        error.code === "invalid_credentials"
          ? "الرقم أو كلمة المرور غير صحيحة"
          : "تعذّر الدخول",
    };
  }

  redirect("/welcome");
}

export type JoinResult = { error?: string; fields?: AuthFieldErrors };

// Inline sign-in/sign-up used by the parliament vote dialog; stays on the page.
export async function joinToVote(input: {
  mode: "login" | "signup";
  phone: string;
  password: string;
  districtId?: string;
}): Promise<JoinResult> {
  const parsed = authSchema.safeParse({ phone: input.phone, password: input.password });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { fields: { phone: flat.phone?.[0], password: flat.password?.[0] } };
  }
  const { phone, password } = parsed.data;

  const signup = input.mode === "signup";
  const district = z.string().uuid().safeParse(input.districtId);
  if (signup && !district.success) return { error: "اختر دائرتك" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!(await checkRateLimit(`auth:${ip}`))) {
    return { error: "محاولات كثيرة، انتظر قليلًا" };
  }

  try {
    const supabase = await createClient();
    const e164 = toE164(phone);

    if (signup) {
      const { data: found } = await createAdminClient()
        .from("districts")
        .select("id")
        .eq("id", district.data!)
        .maybeSingle();
      if (!found) return { error: "الدائرة غير موجودة" };

      const { error } = await supabase.auth.signUp({ phone: e164, password });
      if (error) {
        return {
          error: error.code === "user_already_exists" ? "الرقم مسجل بالفعل" : "تعذّر إنشاء الحساب",
        };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ phone: e164, password });
    if (error || !data.user) {
      return {
        error:
          error?.code === "invalid_credentials"
            ? "الرقم أو كلمة المرور غير صحيحة"
            : "تعذّر الدخول",
      };
    }

    if (signup) {
      const { error: saveError } = await createAdminClient().from("profiles").upsert({
        user_id: data.user.id,
        district_id: district.data!,
        district_changed_at: new Date().toISOString(),
      });
      if (saveError) return { error: "تم إنشاء الحساب، تعذّر حفظ الدائرة" };
    }
  } catch {
    return { error: "تعذّر الدخول" };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
