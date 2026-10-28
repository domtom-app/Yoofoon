import { describe, expect, it } from "vitest";
import { daysUntilChange, phaseOf, toCandidates, toMembers, toPercent, topCandidates, windowStatus } from "@/lib/voting";

describe("daysUntilChange", () => {
  const now = new Date("2026-02-01T00:00:00Z");
  it("allows the first change", () => {
    expect(daysUntilChange(null, now)).toBe(0);
  });
  it("locks for 30 days then unlocks", () => {
    expect(daysUntilChange("2026-01-22T00:00:00Z", now)).toBe(20);
    expect(daysUntilChange("2026-01-02T00:00:00Z", now)).toBe(0);
  });
});

describe("phaseOf", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-10T00:00:00Z");
  it("is voting without dates or inside the window", () => {
    expect(phaseOf(null, null, new Date())).toBe("voting");
    expect(phaseOf(start, end, new Date("2026-01-05T00:00:00Z"))).toBe("voting");
  });
  it("is upcoming before the start", () => {
    expect(phaseOf(start, end, new Date("2025-12-31T23:59:00Z"))).toBe("upcoming");
    expect(windowStatus(start, null, new Date("2025-12-31T00:00:00Z"))).toBe("upcoming");
  });
  it("shows the winner for 3 days after the end", () => {
    expect(phaseOf(start, end, new Date("2026-01-10T00:00:00Z"))).toBe("winner");
    expect(phaseOf(start, end, new Date("2026-01-12T23:59:00Z"))).toBe("winner");
  });
  it("switches to the announcement after 3 days", () => {
    expect(phaseOf(start, end, new Date("2026-01-13T00:00:00Z"))).toBe("announcement");
  });
  it("reports closed windows", () => {
    expect(windowStatus(null, end, end)).toBe("closed");
  });
});

describe("members", () => {
  it("builds location details and picks tied leaders", () => {
    const list = toMembers(
      [
        { id: "a", name: "أ", photo_path: null, votes: 2, governorate: "الجيزة", center: "الدقي", district: "الدائرة 1", district_id: "d1" },
        { id: "b", name: "ب", photo_path: null, votes: 2, governorate: "أسوان", center: null, district: null, district_id: null },
        { id: "c", name: "ج", photo_path: null, votes: 0, governorate: "قنا", center: null, district: null, district_id: null },
      ],
      "https://x",
    );
    expect(list[0].details).toEqual(["الجيزة - الدقي - الدائرة 1"]);
    expect(topCandidates(list).map((c) => c.id)).toEqual(["a", "b"]);
    expect(topCandidates(toCandidates([{ id: "z", name: "ز", photo_path: null, votes: 0 }], "x"))).toEqual([]);
  });
});

describe("voting", () => {
  it("returns 0 when there are no votes", () => {
    expect(toPercent(0, 0)).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(toPercent(1, 3)).toBe(33.3);
    expect(toPercent(2, 3)).toBe(66.7);
  });

  it("computes shares across candidates and builds photo urls", () => {
    const list = toCandidates(
      [
        { id: "a", name: "أ", photo_path: "a.jpg", votes: 3 },
        { id: "b", name: "ب", photo_path: null, votes: 1 },
      ],
      "https://x/photos",
    );
    expect(list.map((c) => c.percent)).toEqual([75, 25]);
    expect(list[0].photoUrl).toBe("https://x/photos/a.jpg");
    expect(list[1].photoUrl).toBeNull();
  });
});
