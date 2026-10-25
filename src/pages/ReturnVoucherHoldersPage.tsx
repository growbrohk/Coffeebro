import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgStaff } from "@/hooks/useOrgStaff";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/hooks/useOrgs";
import { useToast } from "@/hooks/use-toast";
import { useReturnVoucherPresets } from "@/hooks/useReturnVoucherPresets";
import {
  useDeleteReturnVoucherHolders,
  useReturnVoucherHolders,
  type ReturnVoucherHolderRow,
} from "@/hooks/useReturnVoucherHolders";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { downloadCsv, rowsToCsv } from "@/lib/exportCsv";
import { returnVoucherHolderStatus } from "@/lib/returnVoucherState";

const ALL_STATUSES_VALUE = "all";

const HOLDER_STATUS_ORDER = ["not yet valid", "active", "expired", "redeemed", "refunded"];

const DELETE_ROLES = new Set(["owner", "host", "manager"]);

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function holderStatus(row: ReturnVoucherHolderRow): string {
  return returnVoucherHolderStatus({
    status: row.status,
    expiresAt: row.expires_at,
    redeemableFrom: row.redeemable_from,
  });
}

function isoOrEmpty(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function holdersCsvFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "holders"}.csv`;
}

function holderSearchHaystack(row: ReturnVoucherHolderRow): string {
  const status = holderStatus(row);
  const issued = formatWhen(row.created_at);
  const redeemed = formatWhen(row.redeemed_at);
  const expires = formatWhen(row.expires_at);
  return [row.owner_name, row.owner_id, row.code, row.status, status, issued, redeemed, expires]
    .filter((part) => Boolean(part && part !== "—"))
    .join(" ")
    .toLowerCase();
}

export default function ReturnVoucherHoldersPage() {
  const { orgId, presetId } = useParams<{ orgId: string; presetId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: staffAssignments = [], isLoading: staffLoading } = useOrgStaff();
  const { data: org, isLoading: orgLoading } = useOrg(orgId);
  const { data: presets = [], isLoading: presetsLoading } = useReturnVoucherPresets(orgId);
  const { data: rows = [], isLoading: rowsLoading, error } = useReturnVoucherHolders(presetId);
  const removeHolders = useDeleteReturnVoucherHolders(presetId);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES_VALUE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(rows.map((row) => row.voucher_id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const preset = presets.find((row) => row.id === presetId) ?? null;

  const distinctStatuses = useMemo(() => {
    const present = new Set(rows.map((row) => holderStatus(row)));
    const ordered = HOLDER_STATUS_ORDER.filter((status) => present.has(status));
    const extra = Array.from(present)
      .filter((status) => !HOLDER_STATUS_ORDER.includes(status))
      .sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extra];
  }, [rows]);

  const effectiveStatus = distinctStatuses.includes(statusFilter) ? statusFilter : ALL_STATUSES_VALUE;

  const filteredRows = useMemo(() => {
    let out = rows;
    if (effectiveStatus !== ALL_STATUSES_VALUE) {
      out = out.filter((row) => holderStatus(row) === effectiveStatus);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return out;
    return out.filter((row) => holderSearchHaystack(row).includes(query));
  }, [rows, effectiveStatus, searchQuery]);

  const downloadList = () => {
    if (!preset || filteredRows.length === 0) return;
    const csvRows = filteredRows.map((row) => ({
      user: row.owner_name || row.owner_id,
      code: row.code,
      status: holderStatus(row),
      issued: isoOrEmpty(row.created_at),
      redeemed: isoOrEmpty(row.redeemed_at),
      expires: isoOrEmpty(row.expires_at),
    }));
    const csv = rowsToCsv(
      ["User", "Code", "Status", "Issued", "Redeemed", "Expires"],
      csvRows,
      ["user", "code", "status", "issued", "redeemed", "expires"],
    );
    downloadCsv(holdersCsvFilename(preset.title), `\uFEFF${csv}`);
  };

  const summary = useMemo(() => {
    let redeemed = 0;
    let active = 0;
    for (const row of rows) {
      const status = holderStatus(row);
      if (status === "redeemed") redeemed += 1;
      if (status === "active") active += 1;
    }
    return { issued: rows.length, redeemed, active };
  }, [rows]);

  const canAccess =
    Boolean(user && orgId) &&
    canViewCampaignParticipants({
      userId: user?.id,
      isSuperAdmin,
      campaignOrgId: orgId,
      orgOwnerUserId: org?.owner_user_id ?? null,
      staffAssignments,
    });

  const canDelete =
    isSuperAdmin ||
    org?.owner_user_id === user?.id ||
    staffAssignments.some((assignment) => assignment.org_id === orgId && DELETE_ROLES.has(assignment.role));

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.voucher_id)),
    [rows, selectedIds],
  );
  const selectedRedeemed = selectedRows.filter((row) => holderStatus(row) === "redeemed").length;
  const visibleSelectedCount = filteredRows.filter((row) => selectedIds.has(row.voucher_id)).length;
  const headerChecked: boolean | "indeterminate" =
    filteredRows.length > 0 && visibleSelectedCount === filteredRows.length
      ? true
      : visibleSelectedCount > 0
        ? "indeterminate"
        : false;

  const toggleFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = filteredRows.every((row) => next.has(row.voucher_id));
      if (allVisibleSelected) {
        for (const row of filteredRows) next.delete(row.voucher_id);
      } else {
        for (const row of filteredRows) next.add(row.voucher_id);
      }
      return next;
    });
  };

  const toggleRow = (voucherId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(voucherId);
      else next.delete(voucherId);
      return next;
    });
  };

  const handleDelete = async () => {
    const requested = selectedIds.size;
    try {
      const deleted = await removeHolders.mutateAsync([...selectedIds]);
      setSelectedIds(new Set());
      setConfirmOpen(false);
      if (deleted < requested) {
        toast({
          title: `Removed ${deleted} of ${requested}`,
          description: "The rest were already gone.",
        });
      } else {
        toast({
          title: deleted === 1 ? "Removed 1 voucher" : `Removed ${deleted} vouchers`,
        });
      }
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (authLoading || roleLoading || staffLoading || orgLoading || presetsLoading) {
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

  if (!orgId || !org || !presetId || !preset) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <p className="text-center text-muted-foreground">Preset not found.</p>
        <Button
          className="mx-auto mt-4 block"
          variant="outline"
          onClick={() => navigate(orgId ? `/org/${orgId}/vouchers` : "/profile")}
        >
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => navigate(`/org/${orgId}/vouchers`)}
            className="absolute left-0 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-2xl font-bold tracking-normal">Holders</h1>
        </div>
        <div className="border-t border-border px-4 pb-3 pt-2">
          <div className="relative flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, code, status…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              autoComplete="off"
              aria-label="Search holders"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              aria-label="Download list"
              disabled={rowsLoading || filteredRows.length === 0}
              onClick={downloadList}
            >
              <Download className="h-4 w-4" />
            </Button>
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
                  {effectiveStatus !== ALL_STATUSES_VALUE ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                <p className="text-sm font-semibold">Filters</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="holders-status-filter">
                    Status
                  </label>
                  <Select value={effectiveStatus} onValueChange={setStatusFilter}>
                    <SelectTrigger id="holders-status-filter" aria-label="Status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
                      {distinctStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          {org.org_name} · {preset.title}
        </p>
        {error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : rowsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {summary.issued} issued of pool {preset.quantity} · {summary.redeemed} redeemed · {summary.active}{" "}
                active
              </p>
              {canDelete && selectedRows.length > 0 ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                  Delete from wallets ({selectedRows.length})
                </Button>
              ) : null}
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vouchers issued yet.</p>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching holders.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete ? (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={headerChecked}
                          onCheckedChange={() => toggleFiltered()}
                          aria-label="Select shown holders"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead>User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.voucher_id}>
                      {canDelete ? (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(row.voucher_id)}
                            onCheckedChange={(checked) => toggleRow(row.voucher_id, checked === true)}
                            aria-label={`Select ${row.owner_name || row.code}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>{row.owner_name || row.owner_id}</TableCell>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell>{holderStatus(row)}</TableCell>
                      <TableCell className="text-xs">{formatWhen(row.created_at)}</TableCell>
                      <TableCell className="text-xs">{formatWhen(row.redeemed_at)}</TableCell>
                      <TableCell className="text-xs">{formatWhen(row.expires_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedRows.length} {selectedRows.length === 1 ? "voucher" : "vouchers"} from wallets?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.length === 1 ? "This voucher leaves" : "These vouchers leave"} the holder
              {selectedRows.length === 1 ? "" : "s"}&apos; wallet
              {selectedRows.length === 1 ? "" : "s"}. This cannot be undone.
              {selectedRedeemed > 0
                ? ` ${selectedRedeemed} redeemed ${selectedRedeemed === 1 ? "voucher" : "vouchers"} will also lose ${selectedRedeemed === 1 ? "its" : "their"} visit log and review.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeHolders.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeHolders.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {removeHolders.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
