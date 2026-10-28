const EGYPT_PHONE = /^01[0125]\d{8}$/;

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/\D/g, "");
}

export function isEgyptPhone(value: string) {
  return EGYPT_PHONE.test(value);
}

// Supabase phone auth uses E.164 (+20 followed by the number without its leading 0).
export function toE164(phone: string) {
  return `+20${phone.slice(1)}`;
}
