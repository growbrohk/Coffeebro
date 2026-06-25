import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { getVoucherRedemptionDeadline, isVoucherWalletActive } from '@/hooks/useMyVouchers';
import { WalletVoucherCard } from '@/components/WalletVoucherCard';
import { cn } from '@/lib/utils';

function compareCreatedDesc(a: MyVoucher, b: MyVoucher): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function compareInactiveTieBreak(a: MyVoucher, b: MyVoucher): number {
  const aRedeemed = a.redeemed_at ? new Date(a.redeemed_at).getTime() : 0;
  const bRedeemed = b.redeemed_at ? new Date(b.redeemed_at).getTime() : 0;
  if (aRedeemed !== bRedeemed) return bRedeemed - aRedeemed;
  return compareCreatedDesc(a, b);
}

function compareDeadlineAsc(a: MyVoucher, b: MyVoucher): number {
  const aDeadline = getVoucherRedemptionDeadline(a);
  const bDeadline = getVoucherRedemptionDeadline(b);
  if (aDeadline == null && bDeadline == null) return compareCreatedDesc(a, b);
  if (aDeadline == null) return 1;
  if (bDeadline == null) return -1;
  if (aDeadline !== bDeadline) return aDeadline - bDeadline;
  return compareCreatedDesc(a, b);
}

function compareDeadlineDesc(a: MyVoucher, b: MyVoucher): number {
  const aDeadline = getVoucherRedemptionDeadline(a);
  const bDeadline = getVoucherRedemptionDeadline(b);
  if (aDeadline == null && bDeadline == null) return compareInactiveTieBreak(a, b);
  if (aDeadline == null) return 1;
  if (bDeadline == null) return -1;
  if (aDeadline !== bDeadline) return bDeadline - aDeadline;
  return compareInactiveTieBreak(a, b);
}

function inactiveStatusOrder(v: MyVoucher): number {
  if (v.status === 'redeemed') return 0;
  if (v.status === 'expired') return 1;
  return 2;
}

function compareFolderVouchers(a: MyVoucher, b: MyVoucher): number {
  const aActive = isVoucherWalletActive(a);
  const bActive = isVoucherWalletActive(b);
  if (aActive !== bActive) return aActive ? -1 : 1;
  if (!aActive) {
    const statusDiff = inactiveStatusOrder(a) - inactiveStatusOrder(b);
    if (statusDiff !== 0) return statusDiff;
    return compareInactiveTieBreak(a, b);
  }
  return compareDeadlineAsc(a, b);
}

export type TastingPackageFolder = {
  purchaseId: string;
  packageId: string;
  title: string;
  tier: string;
  vouchers: MyVoucher[];
};

export function groupTastingPackageFolders(vouchers: MyVoucher[]): {
  folders: TastingPackageFolder[];
  standalone: MyVoucher[];
} {
  const byPurchase = new Map<string, MyVoucher[]>();
  const standalone: MyVoucher[] = [];

  for (const v of vouchers) {
    if (v.tasting_package_purchase_id) {
      const list = byPurchase.get(v.tasting_package_purchase_id) ?? [];
      list.push(v);
      byPurchase.set(v.tasting_package_purchase_id, list);
    } else {
      standalone.push(v);
    }
  }

  const folders: TastingPackageFolder[] = [];
  for (const [purchaseId, list] of byPurchase) {
    const first = list[0];
    folders.push({
      purchaseId,
      packageId: first.tasting_package_id ?? purchaseId,
      title: first.tasting_package_title ?? 'Tasting package',
      tier: first.tasting_package_tier ?? 'single',
      vouchers: list,
    });
  }

  return { folders, standalone };
}

export type PartitionedWalletLists = {
  activeFolders: TastingPackageFolder[];
  inactiveFolders: TastingPackageFolder[];
  activeStandalone: MyVoucher[];
  inactiveStandalone: MyVoucher[];
};

export function partitionWalletLists(vouchers: MyVoucher[]): PartitionedWalletLists {
  const { folders, standalone } = groupTastingPackageFolders(vouchers);

  const activeFolders: TastingPackageFolder[] = [];
  const inactiveFolders: TastingPackageFolder[] = [];

  for (const folder of folders) {
    const sorted = { ...folder, vouchers: [...folder.vouchers].sort(compareFolderVouchers) };
    if (sorted.vouchers.some(isVoucherWalletActive)) {
      activeFolders.push(sorted);
    } else {
      inactiveFolders.push(sorted);
    }
  }

  const activeStandalone = standalone.filter(isVoucherWalletActive).sort(compareDeadlineAsc);
  const inactiveStandalone = standalone.filter((v) => !isVoucherWalletActive(v)).sort(compareDeadlineDesc);

  return { activeFolders, inactiveFolders, activeStandalone, inactiveStandalone };
}

interface TastingPackageWalletFolderProps {
  folder: TastingPackageFolder;
  defaultOpen?: boolean;
}

export function TastingPackageWalletFolder({ folder, defaultOpen = true }: TastingPackageWalletFolderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const redeemed = folder.vouchers.filter((v) => v.status === 'redeemed').length;
  const total = folder.vouchers.length;
  const tierLabel = folder.tier === 'duo' ? 'Duo' : 'Single';
  const allInactive = folder.vouchers.every((v) => !isVoucherWalletActive(v));

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', allInactive && 'opacity-80')}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{folder.title}</p>
          <p className="text-xs text-muted-foreground">
            {tierLabel} · {redeemed}/{total} redeemed
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-border px-3 pb-3 pt-3">
          {folder.vouchers.map((v) => (
            <WalletVoucherCard key={v.id} voucher={v} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
