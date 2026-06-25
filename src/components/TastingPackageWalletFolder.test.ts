import { describe, expect, it } from 'vitest';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { partitionWalletLists } from '@/components/TastingPackageWalletFolder';

function tastingVoucher(
  id: string,
  purchaseId: string,
  status: MyVoucher['status'] = 'active',
): MyVoucher {
  return {
    id,
    code: `code-${id}`,
    status,
    created_at: '2026-01-01T00:00:00Z',
    redeemed_at: status === 'redeemed' ? '2026-06-01T00:00:00Z' : null,
    expires_at: '2027-01-01T00:00:00Z',
    title: `Drink ${id}`,
    tasting_package_purchase_id: purchaseId,
    tasting_package_id: 'pkg-1',
    tasting_package_title: 'Test package',
    tasting_package_tier: 'single',
  };
}

describe('partitionWalletLists', () => {
  it('keeps redeemed tasting vouchers in the active folder when others remain active', () => {
    const purchaseId = 'purchase-1';
    const vouchers = [
      tastingVoucher('v1', purchaseId, 'redeemed'),
      tastingVoucher('v2', purchaseId, 'active'),
      tastingVoucher('v3', purchaseId, 'active'),
      tastingVoucher('v4', purchaseId, 'active'),
    ];

    const { activeFolders, inactiveFolders, inactiveStandalone } = partitionWalletLists(vouchers);

    expect(activeFolders).toHaveLength(1);
    expect(activeFolders[0].vouchers).toHaveLength(4);
    expect(activeFolders[0].vouchers.filter((v) => v.status === 'redeemed')).toHaveLength(1);
    expect(inactiveFolders).toHaveLength(0);
    expect(inactiveStandalone).toHaveLength(0);
  });

  it('moves folder to inactive when all vouchers are redeemed', () => {
    const purchaseId = 'purchase-2';
    const vouchers = [
      tastingVoucher('v1', purchaseId, 'redeemed'),
      tastingVoucher('v2', purchaseId, 'redeemed'),
    ];

    const { activeFolders, inactiveFolders } = partitionWalletLists(vouchers);

    expect(activeFolders).toHaveLength(0);
    expect(inactiveFolders).toHaveLength(1);
    expect(inactiveFolders[0].vouchers).toHaveLength(2);
  });
});
