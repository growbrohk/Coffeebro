import { describe, expect, it } from "vitest";
import { returnVoucherHolderStatus, returnVoucherState } from "@/lib/returnVoucherState";
import type { CampaignParticipantRow } from "@/hooks/useCampaignParticipants";

const now = new Date("2026-11-01T12:00:00.000Z").getTime();
const past = "2026-10-01T00:00:00.000Z";
const future = "2026-12-01T00:00:00.000Z";

describe("returnVoucherHolderStatus", () => {
  it("keeps stored redeemed, expired, and refunded", () => {
    expect(returnVoucherHolderStatus({ status: "redeemed", expiresAt: past, now })).toBe("redeemed");
    expect(returnVoucherHolderStatus({ status: "expired", expiresAt: future, now })).toBe("expired");
    expect(returnVoucherHolderStatus({ status: "refunded", expiresAt: future, now })).toBe("refunded");
  });

  it("treats an active voucher past expires_at as expired", () => {
    expect(returnVoucherHolderStatus({ status: "active", expiresAt: past, now })).toBe("expired");
  });

  it("treats an active voucher before redeemable_from as not yet valid", () => {
    expect(
      returnVoucherHolderStatus({
        status: "active",
        expiresAt: future,
        redeemableFrom: future,
        now,
      }),
    ).toBe("not yet valid");
  });

  it("stays active inside the redemption window", () => {
    expect(
      returnVoucherHolderStatus({
        status: "active",
        expiresAt: future,
        redeemableFrom: past,
        now,
      }),
    ).toBe("active");
  });

  it("checks expiry before the not-yet-valid window", () => {
    expect(
      returnVoucherHolderStatus({
        status: "active",
        expiresAt: past,
        redeemableFrom: future,
        now,
      }),
    ).toBe("expired");
  });
});

describe("returnVoucherState", () => {
  function row(patch: Partial<CampaignParticipantRow>): CampaignParticipantRow {
    return {
      voucher_id: "v",
      owner_id: "u",
      owner_name: "ada",
      status: "redeemed",
      created_at: past,
      redeemed_at: past,
      code: "ABC",
      offer_type: "free",
      item_name: "Latte",
      return_voucher_status: null,
      return_voucher_redeemed_at: null,
      return_voucher_expires_at: null,
      ...patch,
    };
  }

  it("uses the shared expiry rule for a minted return voucher", () => {
    expect(
      returnVoucherState(
        row({
          return_voucher_status: "active",
          return_voucher_expires_at: past,
        }),
      ),
    ).toBe("expired");
  });
});
