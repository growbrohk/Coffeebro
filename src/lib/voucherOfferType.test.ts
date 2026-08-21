import { describe, expect, it } from "vitest";
import {
  composeDiscountOffer,
  isDiscountOffer,
  isRandomPoolAllowedOffer,
  isValidOfferType,
  menuItemIdFromDb,
  menuItemIdToDb,
  parseDiscountOffer,
} from "./voucherOfferType";
import { voucherOfferLabel, voucherNameFromOfferAndMenu } from "./voucherOfferLabels";

describe("voucherOfferType", () => {
  it("parses and composes percent discounts", () => {
    expect(parseDiscountOffer("percent_discount_10")).toEqual({
      kind: "percent_discount",
      amount: 10,
    });
    expect(composeDiscountOffer("percent_discount", 10)).toBe("percent_discount_10");
  });

  it("parses and composes dollar discounts", () => {
    expect(parseDiscountOffer("dollar_discount_20")).toEqual({
      kind: "dollar_discount",
      amount: 20,
    });
    expect(composeDiscountOffer("dollar_discount", 1)).toBe("dollar_discount_1");
  });

  it("validates offer types", () => {
    expect(isValidOfferType("free")).toBe(true);
    expect(isValidOfferType("percent_discount_10")).toBe(true);
    expect(isValidOfferType("dollar_discount_5")).toBe(true);
    expect(isValidOfferType("percent_discount_0")).toBe(false);
    expect(isValidOfferType("unknown")).toBe(false);
  });

  it("maps any-item sentinel", () => {
    expect(menuItemIdToDb("__any__")).toBeNull();
    expect(menuItemIdFromDb(null)).toBe("__any__");
  });

  it("allows discounts in random pools", () => {
    expect(isRandomPoolAllowedOffer("free")).toBe(true);
    expect(isRandomPoolAllowedOffer("percent_discount_10")).toBe(true);
    expect(isRandomPoolAllowedOffer("b1g1")).toBe(false);
    expect(isDiscountOffer("dollar_discount_3")).toBe(true);
  });
});

describe("voucherOfferLabels", () => {
  it("labels discount offers", () => {
    expect(voucherOfferLabel("percent_discount_10")).toBe("10% off");
    expect(voucherOfferLabel("dollar_discount_20")).toBe("$20 off");
    expect(voucherNameFromOfferAndMenu("percent_discount_10", null)).toBe("10% off · Any item");
    expect(voucherNameFromOfferAndMenu("dollar_discount_20", "Latte")).toBe("$20 off · Latte");
  });
});
