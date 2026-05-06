const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type CreateCheckoutResponse =
  | { requiresPayment: false; amountCents: number; currency: string }
  | {
      requiresPayment: true;
      checkoutUrl: string;
      sessionId?: string;
      reused?: boolean;
    };

export async function createCampaignCheckoutRequest(
  accessToken: string,
  body: { campaignId: string; channel: "grab" | "hunt"; huntQrPayload?: string | null },
): Promise<CreateCheckoutResponse> {
  const res = await fetch(`${supabaseUrl}/functions/v1/create-campaign-checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as CreateCheckoutResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Checkout failed (${res.status})`);
  }
  return json as CreateCheckoutResponse;
}
