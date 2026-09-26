import { describe, expect, it } from "vitest";
import {
  formatReturnVoucherPeriodLabel,
  returnVoucherRedemptionMode,
} from "@/lib/returnVoucherPeriod";

describe("returnVoucherRedemptionMode", () => {
  it("is days after claim when start date is missing", () => {
    expect(returnVoucherRedemptionMode({ redeem_starts_on: null })).toBe("days_after_claim");
  });

  it("is fixed period when start date is set", () => {
    expect(returnVoucherRedemptionMode({ redeem_starts_on: "2026-10-01" })).toBe("fixed_period");
  });
});

describe("formatReturnVoucherPeriodLabel", () => {
  it("uses plural days after claim", () => {
    expect(formatReturnVoucherPeriodLabel({ redeem_valid_days: 7 })).toBe("7 days after claim");
  });

  it("uses singular day after claim", () => {
    expect(formatReturnVoucherPeriodLabel({ redeem_valid_days: 1 })).toBe("1 day after claim");
  });

  it("formats a fixed window", () => {
    const label = formatReturnVoucherPeriodLabel({
      redeem_valid_days: 7,
      redeem_starts_on: "2026-10-01",
      redeem_ends_on: "2026-10-31",
    });
    expect(label).toContain("2026");
    expect(label).toContain("–");
  });
});
