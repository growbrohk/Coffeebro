import { describe, expect, it } from 'vitest';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import { partitionWalletLists, type WalletRow } from '@/components/TastingPackageWalletFolder';

function tastingVoucher(
  id: string,
  purchaseId: string,
  status: MyVoucher['status'] = 'active',
  overrides: Partial<MyVoucher> = {},
): MyVoucher {
  return {
    id,
    code: `code-${id}`,
    status,
    created_at: '2026-01-01T00:00:00Z',
    redeemed_at: status === 'redeemed' ? '2026-06-01T00:00:00Z' : null,
    expires_at: '2027-01-01T00:00:00Z',
    redeemable_from: null,
    title: `Drink ${id}`,
    tasting_package_purchase_id: purchaseId,
    tasting_package_id: 'pkg-1',
    tasting_package_title: 'Test package',
    tasting_package_tier: 'single',
    ...overrides,
  };
}

function standaloneVoucher(
  id: string,
  status: MyVoucher['status'] = 'active',
  overrides: Partial<MyVoucher> = {},
): MyVoucher {
  return {
    id,
    code: `code-${id}`,
    status,
    created_at: '2026-01-01T00:00:00Z',
    redeemed_at: status === 'redeemed' ? '2026-06-01T00:00:00Z' : null,
    expires_at: '2027-01-01T00:00:00Z',
    redeemable_from: null,
    title: `Drink ${id}`,
    ...overrides,
  };
}

function foldersOf(rows: WalletRow[]) {
  return rows.filter((r): r is Extract<WalletRow, { kind: 'folder' }> => r.kind === 'folder').map((r) => r.folder);
}

function rowIds(rows: WalletRow[]) {
  return rows.map((r) => (r.kind === 'folder' ? r.folder.purchaseId : r.voucher.id));
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

    const { activeRows, inactiveRows } = partitionWalletLists(vouchers);
    const activeFolders = foldersOf(activeRows);
    const inactiveFolders = foldersOf(inactiveRows);

    expect(activeFolders).toHaveLength(1);
    expect(activeFolders[0].vouchers).toHaveLength(4);
    expect(activeFolders[0].vouchers.filter((v) => v.status === 'redeemed')).toHaveLength(1);
    expect(inactiveFolders).toHaveLength(0);
    expect(inactiveRows.filter((r) => r.kind === 'voucher')).toHaveLength(0);
  });

  it('moves folder to inactive when all vouchers are redeemed', () => {
    const purchaseId = 'purchase-2';
    const vouchers = [
      tastingVoucher('v1', purchaseId, 'redeemed'),
      tastingVoucher('v2', purchaseId, 'redeemed'),
    ];

    const { activeRows, inactiveRows } = partitionWalletLists(vouchers);
    const activeFolders = foldersOf(activeRows);
    const inactiveFolders = foldersOf(inactiveRows);

    expect(activeFolders).toHaveLength(0);
    expect(inactiveFolders).toHaveLength(1);
    expect(inactiveFolders[0].vouchers).toHaveLength(2);
  });

  it('orders an active folder against standalone vouchers by deadline ascending', () => {
    const folder = [
      tastingVoucher('f1', 'purchase-early', 'active', { expires_at: '2027-01-01T00:00:00Z' }),
      tastingVoucher('f2', 'purchase-early', 'active', { expires_at: '2027-01-01T00:00:00Z' }),
    ];
    const earlierStandalone = standaloneVoucher('s-earlier', 'active', {
      expires_at: '2026-12-01T00:00:00Z',
    });
    const laterStandalone = standaloneVoucher('s-later', 'active', {
      expires_at: '2027-03-01T00:00:00Z',
    });

    const { activeRows, inactiveRows } = partitionWalletLists([
      laterStandalone,
      ...folder,
      earlierStandalone,
    ]);

    expect(inactiveRows).toHaveLength(0);
    expect(rowIds(activeRows)).toEqual(['s-earlier', 'purchase-early', 's-later']);
  });

  it('orders an expired folder against standalone vouchers by deadline descending', () => {
    const folder = [
      tastingVoucher('f1', 'purchase-july', 'expired', { expires_at: '2026-07-02T00:00:00Z' }),
      tastingVoucher('f2', 'purchase-july', 'expired', { expires_at: '2026-07-02T00:00:00Z' }),
    ];
    const olderStandalone = standaloneVoucher('s-june', 'expired', {
      expires_at: '2026-06-01T00:00:00Z',
    });
    const newerStandalone = standaloneVoucher('s-sept', 'expired', {
      expires_at: '2026-09-20T00:00:00Z',
    });

    const { activeRows, inactiveRows } = partitionWalletLists([
      olderStandalone,
      ...folder,
      newerStandalone,
    ]);

    expect(activeRows).toHaveLength(0);
    expect(rowIds(inactiveRows)).toEqual(['s-sept', 'purchase-july', 's-june']);
  });
});
