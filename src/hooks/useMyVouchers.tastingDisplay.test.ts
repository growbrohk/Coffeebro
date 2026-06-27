import { describe, expect, it } from 'vitest';
import type { MyVoucher } from '@/hooks/useMyVouchers';
import {
  formatTastingFolderRedemptionDate,
  formatTastingVoucherShopHours,
} from '@/hooks/useMyVouchers';

function tastingVoucher(overrides: Partial<MyVoucher> = {}): MyVoucher {
  return {
    id: 'v1',
    code: 'code-1',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    redeemed_at: null,
    expires_at: '2026-06-28T15:59:59Z',
    title: 'Latte',
    tasting_package_purchase_id: 'purchase-1',
    event_date: '2026-06-28',
    opening_hours: {
      sat: { closed: false, open: '09:00', close: '18:00' },
      sun: { closed: true, open: '09:00', close: '18:00' },
    },
    ...overrides,
  };
}

describe('formatTastingFolderRedemptionDate', () => {
  it('formats redeem date from any voucher in the folder', () => {
    const vouchers = [
      tastingVoucher({ id: 'v1', event_date: null }),
      tastingVoucher({ id: 'v2', event_date: '2026-06-28' }),
    ];

    const result = formatTastingFolderRedemptionDate(vouchers);
    expect(result).toContain('Jun');
    expect(result).toContain('2026');
    expect(result).toContain('28');
  });

  it('returns em dash when no event_date in folder', () => {
    expect(formatTastingFolderRedemptionDate([tastingVoucher({ event_date: null })])).toBe('—');
  });
});

describe('formatTastingVoucherShopHours', () => {
  it('returns compact hours for the redemption weekday', () => {
    // 2026-06-28 is a Sunday in local noon parsing — openingDayKeyFromDate uses JS getDay()
    const voucher = tastingVoucher({
      event_date: '2026-06-28',
      opening_hours: {
        sun: { closed: false, open: '09:00', close: '18:00' },
      },
    });

    expect(formatTastingVoucherShopHours(voucher)).toBe('0900-1800');
  });

  it('returns Closed when shop is closed that day', () => {
    const voucher = tastingVoucher({
      event_date: '2026-06-28',
      opening_hours: {
        sun: { closed: true, open: '09:00', close: '18:00' },
      },
    });

    expect(formatTastingVoucherShopHours(voucher)).toBe('Closed');
  });

  it('returns em dash for non-tasting or missing date', () => {
    expect(formatTastingVoucherShopHours(tastingVoucher({ tasting_package_purchase_id: null }))).toBe('—');
    expect(formatTastingVoucherShopHours(tastingVoucher({ event_date: null }))).toBe('—');
  });
});
