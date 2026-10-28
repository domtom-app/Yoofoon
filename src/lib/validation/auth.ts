import { z } from "zod";
import { isEgyptPhone, normalizeDigits } from "@/lib/phone";

export const authSchema = z.object({
  phone: z
    .string()
    .transform(normalizeDigits)
    .refine(isEgyptPhone, "رقم هاتف مصري من 11 رقمًا"),
  password: z.string().min(6, "6 أحرف على الأقل").max(72, "كلمة المرور طويلة"),
});

export type AuthFieldErrors = { phone?: string; password?: string };
