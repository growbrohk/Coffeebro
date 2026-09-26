import { describe, expect, it } from "vitest";
import {
  formatPeriodBound,
  formatReturnVoucherPeriodLabel,
  periodBoundFromSaved,
  periodBoundToInstant,
  returnVoucherRedemptionMode,
  validateRedemptionPeriod,
} from "@/lib/returnVoucherPeriod";

describe("returnVoucherRedemptionMode", () => {
  it("is days after claim when start is missing", () => {
    expect(returnVoucherRedemptionMode({ redeem_starts_at: null })).toBe("days_after_claim");
  });

  it("is fixed period when start is set", () => {
    expect(returnVoucherRedemptionMode({ redeem_starts_at: "2026-10-01T01:00:00.000Z" })).toBe(
      "fixed_period",
    );
  });
});

describe("periodBoundToInstant", () => {
  it("uses local midnight for a date-only start", () => {
    const start = periodBoundToInstant("2026-10-01", "start");
    expect(start?.getFullYear()).toBe(2026);
    expect(start?.getMonth()).toBe(9);
    expect(start?.getDate()).toBe(1);
    expect(start?.getHours()).toBe(0);
    expect(start?.getMinutes()).toBe(0);
  });

  it("uses local midnight of the next day for a date-only end", () => {
    const end = periodBoundToInstant("2026-10-31", "end");
    expect(end?.getFullYear()).toBe(2026);
    expect(end?.getMonth()).toBe(10);
    expect(end?.getDate()).toBe(1);
    expect(end?.getHours()).toBe(0);
  });

  it("keeps a picked local time", () => {
    const start = periodBoundToInstant("2026-10-01T09:30", "start");
    expect(start?.getHours()).toBe(9);
    expect(start?.getMinutes()).toBe(30);
  });

  it("re-parses a converted ISO instant without shifting the end", () => {
    const start = periodBoundToInstant("2026-10-01", "start")!;
    const end = periodBoundToInstant("2026-10-31", "end")!;
    expect(periodBoundToInstant(start.toISOString(), "start")?.getTime()).toBe(start.getTime());
    expect(periodBoundToInstant(end.toISOString(), "end")?.getTime()).toBe(end.getTime());
  });

  it("returns null for an invalid value", () => {
    expect(periodBoundToInstant("not-a-date", "start")).toBeNull();
  });
});

describe("periodBoundFromSaved", () => {
  it("round-trips an all-day window as dates only", () => {
    const startIso = periodBoundToInstant("2026-10-01", "start")!.toISOString();
    const endIso = periodBoundToInstant("2026-10-31", "end")!.toISOString();
    expect(periodBoundFromSaved(startIso, "start")).toBe("2026-10-01");
    expect(periodBoundFromSaved(endIso, "end")).toBe("2026-10-31");
  });

  it("keeps a non-midnight time on reload", () => {
    const iso = periodBoundToInstant("2026-10-01T09:30", "start")!.toISOString();
    expect(periodBoundFromSaved(iso, "start")).toBe("2026-10-01T09:30");
  });
});

describe("formatReturnVoucherPeriodLabel", () => {
  it("uses plural days after claim", () => {
    expect(formatReturnVoucherPeriodLabel({ redeem_valid_days: 7 })).toBe("7 days after claim");
  });

  it("uses singular day after claim", () => {
    expect(formatReturnVoucherPeriodLabel({ redeem_valid_days: 1 })).toBe("1 day after claim");
  });

  it("formats a fixed window with times", () => {
    const label = formatReturnVoucherPeriodLabel({
      redeem_valid_days: 7,
      redeem_starts_at: "2026-10-01T01:00:00.000Z",
      redeem_ends_at: "2026-10-31T10:00:00.000Z",
    });
    expect(label).toContain("2026");
    expect(label).toContain("–");
  });

  it("formats an all-day window as dates only", () => {
    const startIso = periodBoundToInstant("2026-10-01", "start")!.toISOString();
    const endIso = periodBoundToInstant("2026-10-31", "end")!.toISOString();
    const start = formatPeriodBound(startIso, "start");
    const end = formatPeriodBound(endIso, "end");
    expect(start).toContain("2026");
    expect(end).toContain("31");
    expect(end).not.toMatch(/\d{1,2}:\d{2}/);
    expect(
      formatReturnVoucherPeriodLabel({
        redeem_valid_days: 7,
        redeem_starts_at: startIso,
        redeem_ends_at: endIso,
      }),
    ).toBe(`${start} – ${end}`);
  });
});

describe("validateRedemptionPeriod", () => {
  it("requires 1–90 days after claim", () => {
    expect(validateRedemptionPeriod({ redemption_mode: "days_after_claim", redeem_valid_days: 7 })).toBeNull();
    expect(validateRedemptionPeriod({ redemption_mode: "days_after_claim", redeem_valid_days: 0 })).toBe(
      "Valid days must be between 1 and 90",
    );
  });

  it("requires both dates and end after start", () => {
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "",
        redeem_ends_at: "",
      }),
    ).toBe("Start and end date are required");
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "2026-10-31T18:00",
        redeem_ends_at: "2026-10-01T09:00",
      }),
    ).toBe("End must be after start");
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "2026-10-01T09:00",
        redeem_ends_at: "2026-10-31T18:00",
      }),
    ).toBeNull();
  });

  it("allows a same-day window with no times", () => {
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "2026-10-01",
        redeem_ends_at: "2026-10-01",
      }),
    ).toBeNull();
  });

  it("accepts a campaign-save ISO pair from a valid draft", () => {
    const startIso = periodBoundToInstant("2026-10-01", "start")!.toISOString();
    const endIso = periodBoundToInstant("2026-10-31", "end")!.toISOString();
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: startIso,
        redeem_ends_at: endIso,
      }),
    ).toBeNull();
  });

  it("rejects inverted ISO instants", () => {
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "2026-10-31T10:00:00.000Z",
        redeem_ends_at: "2026-10-01T01:00:00.000Z",
      }),
    ).toBe("End must be after start");
  });

  it("requires both dates when only the end is set", () => {
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "",
        redeem_ends_at: "2026-10-31",
      }),
    ).toBe("Start and end date are required");
  });
});
