/** Maps Postgres RPC / PostgREST errors from redeem_catalog_item etc. */
export function formatRedeemCatalogError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("PER_USER_REDEEM_LIMIT")) {
    return "You’ve reached the limit for this reward.";
  }
  if (msg.includes("CATALOG_SOLD_OUT")) {
    return "This reward is sold out.";
  }
  if (msg.includes("INSUFFICIENT_POINTS")) {
    return "Not enough points.";
  }
  if (msg.includes("CATALOG_INACTIVE") || msg.includes("CATALOG_NOT_FOUND")) {
    return "This reward is no longer available.";
  }
  if (msg.includes("NOT_AUTHORIZED")) {
    return "Sign in to redeem.";
  }
  return msg || "Could not redeem. Try again.";
}
