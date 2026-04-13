import type { NavigateOptions } from "react-router-dom";

/** Location state set when opening staff flows from the public campaign detail page. */
export type CampaignDetailReturnLocationState = {
  returnTo?: string;
};

/** Only allow in-app paths under /campaigns/ (avoid open redirects). */
export function readCampaignDetailReturnTo(state: unknown): string | undefined {
  if (!state || typeof state !== "object") return undefined;
  const v = (state as CampaignDetailReturnLocationState).returnTo;
  if (typeof v !== "string" || !v.startsWith("/campaigns/")) return undefined;
  return v;
}

export function campaignDetailReturnState(campaignId: string): Pick<NavigateOptions, "state"> {
  return { state: { returnTo: `/campaigns/${campaignId}` } satisfies CampaignDetailReturnLocationState };
}
