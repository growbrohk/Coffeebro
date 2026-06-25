import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { isVoucherWalletActive } from '@/hooks/useMyVouchers';
import { WalletVoucherCard } from '@/components/WalletVoucherCard';
import { cn } from '@/lib/utils';

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
