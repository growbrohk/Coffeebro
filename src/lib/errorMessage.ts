export function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}

export function getAdminTastingPackageSaveErrorMessage(error: unknown): string {
  const msg = getErrorMessage(error);
  if (
    msg.includes("TASTING_PACKAGE_SHOP_LIMIT") ||
    msg.toLowerCase().includes("tasting_package_shop_limit")
  ) {
    return "Too many shops — remove extras down to 5, then save again";
  }
  if (msg.includes("vouchers_source_check")) {
    return "Cannot change package structure — customers already hold vouchers for this package";
  }
  return msg;
}
