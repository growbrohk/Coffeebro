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

export type ReturnVoucherHolderStatus =
  | "active"
  | "not yet valid"
  | "expired"
  | "redeemed"
  | "refunded";

const STORED_HOLDER_STATUSES = new Set<ReturnVoucherHolderStatus>(["expired", "redeemed", "refunded"]);

/** Wallet-aligned status for an issued voucher. `active` past `expiresAt` is expired. */
export function returnVoucherHolderStatus(input: {
  status: string | null;
  expiresAt: string | null;
  redeemableFrom?: string | null;
  now?: number;
}): ReturnVoucherHolderStatus | string {
  const status = input.status ?? "";
  if (STORED_HOLDER_STATUSES.has(status as ReturnVoucherHolderStatus)) {
    return status;
  }
  const now = input.now ?? Date.now();
  if (status === "active") {
    if (input.expiresAt) {
      const deadline = new Date(input.expiresAt).getTime();
      if (!Number.isNaN(deadline) && deadline < now) return "expired";
    }
    if (input.redeemableFrom) {
      const start = new Date(input.redeemableFrom).getTime();
      if (!Number.isNaN(start) && start > now) return "not yet valid";
    }
    return "active";
  }
  return status;
}

function isReturnVoucherExpired(
  status: string | null,
  expiresAt: string | null,
): boolean {
  return returnVoucherHolderStatus({ status, expiresAt, redeemableFrom: null }) === "expired";
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
