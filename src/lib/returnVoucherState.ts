import type { CampaignParticipantRow } from "@/hooks/useCampaignParticipants";

export type ReturnVoucherState =
  | "not_applicable"
  | "not_issued"
  | "active"
  | "expired"
  | "redeemed";

export const RETURN_VOUCHER_STATE_LABELS: Record<ReturnVoucherState, string> = {
  not_applicable: "Not applicable",
  not_issued: "Not issued",
  active: "active",
  expired: "expired",
  redeemed: "redeemed",
};

export const RETURN_VOUCHER_FILTER_ORDER: ReturnVoucherState[] = [
  "not_issued",
  "active",
  "expired",
  "redeemed",
  "not_applicable",
];

function isReturnVoucherExpired(
  status: string | null,
  expiresAt: string | null,
): boolean {
  if (status === "expired") return true;
  if (status !== "active" || !expiresAt) return false;
  const deadline = new Date(expiresAt).getTime();
  return !Number.isNaN(deadline) && deadline < Date.now();
}

export function returnVoucherState(r: CampaignParticipantRow): ReturnVoucherState {
  if (r.return_voucher_status) {
    if (r.return_voucher_status === "redeemed") return "redeemed";
    if (isReturnVoucherExpired(r.return_voucher_status, r.return_voucher_expires_at)) {
      return "expired";
    }
    return "active";
  }
  if (r.redeemed_at) return "not_issued";
  return "not_applicable";
}

export function returnVoucherCellLabel(state: ReturnVoucherState): string {
  if (state === "not_applicable") return "—";
  if (state === "not_issued") return "not issued";
  return state;
}

export function formatReturnVoucherRedeemedAt(redeemedAt: string | null): string {
  if (!redeemedAt) return "";
  return new Date(redeemedAt).toLocaleString();
}
