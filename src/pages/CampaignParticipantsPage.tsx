import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgStaff } from "@/hooks/useOrgStaff";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useCampaign } from "@/hooks/useOrgCampaigns";
import { useCampaignParticipants } from "@/hooks/useCampaignParticipants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canViewCampaignParticipants } from "@/lib/canViewCampaignParticipants";
import { readCampaignDetailReturnTo } from "@/lib/campaignDetailReturnNav";
import {
  RETURN_VOUCHER_FILTER_ORDER,
  RETURN_VOUCHER_STATE_LABELS,
  formatReturnVoucherRedeemedAt,
  returnVoucherCellLabel,
  returnVoucherState,
  type ReturnVoucherState,
} from "@/lib/returnVoucherState";
import { voucherNameFromOfferAndMenu } from "@/lib/voucherOfferLabels";
import type { CampaignParticipantRow } from "@/hooks/useCampaignParticipants";

const ALL_STATUSES_VALUE = "all";
const ALL_VOUCHERS_VALUE = "all";
const ALL_RETURN_VOUCHERS_VALUE = "all";
const NOT_APPLICABLE_FILTER_VALUE = "__not_applicable__";
const NOT_ISSUED_FILTER_VALUE = "__not_issued__";

function voucherFilterKey(r: CampaignParticipantRow): string {
  return JSON.stringify([r.offer_type ?? null, r.item_name ?? null]);
}

function participantSearchHaystack(r: CampaignParticipantRow): string {
  const displayName = voucherNameFromOfferAndMenu(r.offer_type, r.item_name);
  const claimed = new Date(r.created_at).toLocaleString();
  const redeemed = r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : "";
  const rvState = returnVoucherState(r);
  const rvLabel = returnVoucherCellLabel(rvState);
  const rvRedeemed = formatReturnVoucherRedeemedAt(r.return_voucher_redeemed_at);
  return [
    r.owner_name,
    r.owner_id,
    r.code,
    r.status,
    displayName,
    r.offer_type,
    r.item_name,
    r.created_at,
    r.redeemed_at,
    claimed,
    redeemed,
    rvState,
    rvLabel,
    rvRedeemed,
    r.return_voucher_status,
    r.return_voucher_redeemed_at,
  ]
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .join(" ")
    .toLowerCase();
}

function returnVoucherFilterValue(state: ReturnVoucherState): string {
  if (state === "not_applicable") return NOT_APPLICABLE_FILTER_VALUE;
  if (state === "not_issued") return NOT_ISSUED_FILTER_VALUE;
  return state;
}

function matchesReturnVoucherFilter(r: CampaignParticipantRow, filter: string): boolean {
  if (filter === ALL_RETURN_VOUCHERS_VALUE) return true;
  return returnVoucherFilterValue(returnVoucherState(r)) === filter;
}

export default function CampaignParticipantsPage() {
  const { orgId, campaignId } = useParams<{ orgId: string; campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnToCampaignDetail = readCampaignDetailReturnTo(location.state);
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: staffAssignments = [], isLoading: staffLoading } = useOrgStaff();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: campaign, isLoading: campLoading } = useCampaign(orgId, campaignId);
  const { data: rows = [], isLoading: rowsLoading, error } = useCampaignParticipants(campaignId);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES_VALUE);
  const [voucherFilter, setVoucherFilter] = useState<string>(ALL_VOUCHERS_VALUE);
  const [returnVoucherFilter, setReturnVoucherFilter] = useState<string>(ALL_RETURN_VOUCHERS_VALUE);
  const [filterOpen, setFilterOpen] = useState(false);

  const showReturnVoucherColumn = useMemo(
    () =>
      Boolean(campaign?.return_voucher_preset_id) ||
      rows.some((r) => r.return_voucher_status != null),
    [campaign?.return_voucher_preset_id, rows],
  );

  const distinctStatuses = useMemo(() => {
    const set = new Set(rows.map((r) => r.status).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const distinctVoucherOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const r of rows) {
      const key = voucherFilterKey(r);
      if (!byKey.has(key)) {
        byKey.set(key, voucherNameFromOfferAndMenu(r.offer_type, r.item_name) ?? "—");
      }
    }
    return Array.from(byKey.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const voucherKeys = useMemo(() => distinctVoucherOptions.map((o) => o.key), [distinctVoucherOptions]);

  const effectiveStatus = useMemo(() => {
    if (statusFilter === ALL_STATUSES_VALUE) return ALL_STATUSES_VALUE;
    return distinctStatuses.includes(statusFilter) ? statusFilter : ALL_STATUSES_VALUE;
  }, [statusFilter, distinctStatuses]);

  const effectiveVoucher = useMemo(() => {
    if (voucherFilter === ALL_VOUCHERS_VALUE) return ALL_VOUCHERS_VALUE;
    return voucherKeys.includes(voucherFilter) ? voucherFilter : ALL_VOUCHERS_VALUE;
  }, [voucherFilter, voucherKeys]);

  const distinctReturnVoucherOptions = useMemo(() => {
    const present = new Set(rows.map((r) => returnVoucherState(r)));
    return RETURN_VOUCHER_FILTER_ORDER.filter((state) => present.has(state)).map((state) => ({
      value: returnVoucherFilterValue(state),
      label: RETURN_VOUCHER_STATE_LABELS[state],
    }));
  }, [rows]);

  const returnVoucherFilterValues = useMemo(
    () => distinctReturnVoucherOptions.map((o) => o.value),
    [distinctReturnVoucherOptions],
  );

  const effectiveReturnVoucher = useMemo(() => {
    if (returnVoucherFilter === ALL_RETURN_VOUCHERS_VALUE) return ALL_RETURN_VOUCHERS_VALUE;
    return returnVoucherFilterValues.includes(returnVoucherFilter)
      ? returnVoucherFilter
      : ALL_RETURN_VOUCHERS_VALUE;
  }, [returnVoucherFilter, returnVoucherFilterValues]);

  const filtersActive =
    effectiveStatus !== ALL_STATUSES_VALUE ||
    effectiveVoucher !== ALL_VOUCHERS_VALUE ||
    (showReturnVoucherColumn && effectiveReturnVoucher !== ALL_RETURN_VOUCHERS_VALUE);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (effectiveStatus !== ALL_STATUSES_VALUE) {
      out = out.filter((r) => r.status === effectiveStatus);
    }
    if (effectiveVoucher !== ALL_VOUCHERS_VALUE) {
      out = out.filter((r) => voucherFilterKey(r) === effectiveVoucher);
    }
    if (showReturnVoucherColumn && effectiveReturnVoucher !== ALL_RETURN_VOUCHERS_VALUE) {
      out = out.filter((r) => matchesReturnVoucherFilter(r, effectiveReturnVoucher));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return out;
    return out.filter((r) => participantSearchHaystack(r).includes(q));
  }, [rows, effectiveStatus, effectiveVoucher, effectiveReturnVoucher, showReturnVoucherColumn, searchQuery]);

  const canAccess =
    Boolean(user && orgId) &&
    canViewCampaignParticipants({
      userId: user?.id,
      isSuperAdmin,
      campaignOrgId: orgId,
      orgOwnerUserId: org?.owner_user_id ?? null,
      staffAssignments,
    });

  if (authLoading || roleLoading || staffLoading || orgLoading || campLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">You don&apos;t have access to this page.</p>
        <Button className="mx-auto mt-4 block" variant="outline" onClick={() => navigate("/settings")}>
          Back
        </Button>
      </div>
    );
  }

  if (!orgId || !campaignId || !org || !campaign) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() =>
              returnToCampaignDetail
                ? navigate(returnToCampaignDetail, { replace: true })
                : navigate(`/org/${orgId}/campaigns/${campaignId}`)
            }
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-2xl font-bold tracking-normal">Participants</h1>
        </div>
        <div className="border-t border-border px-4 pb-3 pt-2">
          <div className="relative flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, code, voucher, status…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              autoComplete="off"
              aria-label="Search participants"
            />
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 shrink-0 rounded-full"
                  aria-label="Open filters"
                >
                  <Filter className="h-4 w-4" />
                  {filtersActive ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                <p className="text-sm font-semibold">Filters</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="participants-status-filter">
                    Status
                  </label>
                  <Select value={effectiveStatus} onValueChange={setStatusFilter}>
                    <SelectTrigger id="participants-status-filter" aria-label="Status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
                      {distinctStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="participants-voucher-filter">
                    Voucher
                  </label>
                  <Select value={effectiveVoucher} onValueChange={setVoucherFilter}>
                    <SelectTrigger id="participants-voucher-filter" aria-label="Voucher type">
                      <SelectValue placeholder="All vouchers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VOUCHERS_VALUE}>All vouchers</SelectItem>
                      {distinctVoucherOptions.map(({ key, label }) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {showReturnVoucherColumn ? (
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="participants-return-voucher-filter"
                    >
                      Return voucher
                    </label>
                    <Select value={effectiveReturnVoucher} onValueChange={setReturnVoucherFilter}>
                      <SelectTrigger id="participants-return-voucher-filter" aria-label="Return voucher status">
                        <SelectValue placeholder="All return vouchers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_RETURN_VOUCHERS_VALUE}>All return vouchers</SelectItem>
                        {distinctReturnVoucherOptions.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          {org.org_name} · {campaign.display_title ?? campaign.id}
        </p>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : rowsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vouchers claimed yet.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching participants.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Voucher name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Redeemed</TableHead>
                {showReturnVoucherColumn ? <TableHead>Return voucher</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => {
                const rvState = returnVoucherState(r);
                const rvRedeemedAt = formatReturnVoucherRedeemedAt(r.return_voucher_redeemed_at);
                return (
                <TableRow key={r.voucher_id}>
                  <TableCell>{r.owner_name || r.owner_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="max-w-[12rem] text-xs">
                    {voucherNameFromOfferAndMenu(r.offer_type, r.item_name) ?? "—"}
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">
                    {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : "—"}
                  </TableCell>
                  {showReturnVoucherColumn ? (
                    <TableCell className="text-xs">
                      <div>{returnVoucherCellLabel(rvState)}</div>
                      {rvState === "redeemed" && rvRedeemedAt ? (
                        <div className="text-muted-foreground">{rvRedeemedAt}</div>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
