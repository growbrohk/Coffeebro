const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type CreateTastingCheckoutResponse =
  | { requiresPayment: false; amountCents: number; currency: string }
  | {
      requiresPayment: true;
      checkoutUrl: string;
      sessionId?: string;
      reused?: boolean;
    };

export async function createTastingPackageCheckoutRequest(
  accessToken: string,
  body: { packageId: string; tier: "single" | "duo"; redeemDate: string; ref?: string },
): Promise<CreateTastingCheckoutResponse> {
  const res = await fetch(`${supabaseUrl}/functions/v1/create-tasting-package-checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      origin: window.location.origin,
    }),
  });
  const json = (await res.json()) as CreateTastingCheckoutResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Checkout failed (${res.status})`);
  }
  return json as CreateTastingCheckoutResponse;
}
