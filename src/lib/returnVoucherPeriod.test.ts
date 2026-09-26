import { describe, expect, it } from "vitest";
import {
  formatReturnVoucherPeriodLabel,
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
});

describe("validateRedemptionPeriod", () => {
  it("requires 1–90 days after claim", () => {
    expect(validateRedemptionPeriod({ redemption_mode: "days_after_claim", redeem_valid_days: 7 })).toBeNull();
    expect(validateRedemptionPeriod({ redemption_mode: "days_after_claim", redeem_valid_days: 0 })).toBe(
      "Valid days must be between 1 and 90",
    );
  });

  it("requires both instants and end after start", () => {
    expect(
      validateRedemptionPeriod({
        redemption_mode: "fixed_period",
        redeem_valid_days: 7,
        redeem_starts_at: "",
        redeem_ends_at: "",
      }),
    ).toBe("Start and end time are required");
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
});
