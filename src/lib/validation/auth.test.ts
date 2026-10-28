import { describe, expect, it } from "vitest";
import { authSchema } from "@/lib/validation/auth";

const parse = (phone: string, password = "secret1") =>
  authSchema.safeParse({ phone, password }).success;

describe("authSchema", () => {
  it("accepts Egyptian 11-digit numbers", () => {
    for (const p of ["01012345678", "01112345678", "01212345678", "01512345678"]) {
      expect(parse(p)).toBe(true);
    }
  });

  it("accepts Arabic-Indic digits", () => {
    expect(parse("٠١٠١٢٣٤٥٦٧٨")).toBe(true);
  });

  it("rejects wrong length or prefix", () => {
    expect(parse("0101234567")).toBe(false);
    expect(parse("010123456789")).toBe(false);
    expect(parse("01312345678")).toBe(false);
    expect(parse("02012345678")).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(parse("01012345678", "123")).toBe(false);
  });
});
