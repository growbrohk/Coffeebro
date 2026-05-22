import { describe, it, expect } from "vitest";
import { shouldSkipReceiptCompression } from "./compressReceiptImage";

describe("shouldSkipReceiptCompression", () => {
  it("skips when file is small and within max edge", () => {
    expect(shouldSkipReceiptCompression(200_000, 800, 1200)).toBe(true);
    expect(shouldSkipReceiptCompression(400_000, 1280, 720)).toBe(true);
  });

  it("does not skip when file exceeds byte threshold", () => {
    expect(shouldSkipReceiptCompression(400_001, 1000, 1000)).toBe(false);
  });

  it("does not skip when long edge exceeds max edge", () => {
    expect(shouldSkipReceiptCompression(100_000, 1281, 900)).toBe(false);
    expect(shouldSkipReceiptCompression(50_000, 2000, 1500)).toBe(false);
  });
});
