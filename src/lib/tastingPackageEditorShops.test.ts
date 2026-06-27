import { describe, expect, it } from 'vitest';
import {
  mergeLoadedShopsToDraft,
  normalizeSharedShops,
  splitDraftToTierShops,
} from '@/lib/tastingPackageEditorShops';
import type { TastingPackageSharedShopDraft } from '@/types/tastingPackage';

describe('splitDraftToTierShops', () => {
  it('copies single drink into duo portion 1', () => {
    const shops: TastingPackageSharedShopDraft[] = [
      {
        clientId: 'c1',
        org_id: 'org-a',
        single_menu_item_id: 'menu-single',
        duo_extra_menu_item_id: 'menu-extra',
      },
    ];

    const { singleShops, duoShops } = splitDraftToTierShops(shops);

    expect(singleShops).toHaveLength(1);
    expect(singleShops[0].menu_item_ids).toEqual(['menu-single']);
    expect(duoShops).toHaveLength(1);
    expect(duoShops[0].menu_item_ids).toEqual(['menu-single', 'menu-extra']);
  });

  it('skips rows without org_id', () => {
    const { singleShops, duoShops } = splitDraftToTierShops([
      {
        clientId: 'c1',
        org_id: '',
        single_menu_item_id: 'm1',
        duo_extra_menu_item_id: 'm2',
      },
    ]);
    expect(singleShops).toHaveLength(0);
    expect(duoShops).toHaveLength(0);
  });

  it('caps and dedupes before save', () => {
    const shops = Array.from({ length: 7 }, (_, i) => ({
      clientId: `c${i}`,
      org_id: `org-${i}`,
      single_menu_item_id: 'm1',
      duo_extra_menu_item_id: 'm2',
    }));
    const { singleShops, duoShops } = splitDraftToTierShops(shops);
    expect(singleShops).toHaveLength(5);
    expect(duoShops).toHaveLength(5);
  });
});

describe('normalizeSharedShops', () => {
  it('dedupes duplicate org_ids', () => {
    const out = normalizeSharedShops([
      { clientId: '1', org_id: 'a', single_menu_item_id: '', duo_extra_menu_item_id: '' },
      { clientId: '2', org_id: 'a', single_menu_item_id: '', duo_extra_menu_item_id: '' },
      { clientId: '3', org_id: 'b', single_menu_item_id: '', duo_extra_menu_item_id: '' },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.org_id)).toEqual(['a', 'b']);
  });
});

describe('mergeLoadedShopsToDraft', () => {
  it('round-trips with splitDraftToTierShops', () => {
    const singleRows = [
      { id: 's1', org_id: 'org-a', menu_item_ids: ['menu-single'] },
      { id: 's2', org_id: 'org-b', menu_item_ids: ['menu-b-single'] },
    ];
    const duoRows = [
      { id: 'd1', org_id: 'org-a', menu_item_ids: ['menu-single', 'menu-extra'] },
      { id: 'd2', org_id: 'org-b', menu_item_ids: ['menu-b-single', 'menu-b-extra'] },
    ];

    const merged = mergeLoadedShopsToDraft(singleRows, duoRows);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      org_id: 'org-a',
      single_menu_item_id: 'menu-single',
      duo_extra_menu_item_id: 'menu-extra',
    });

    const { singleShops, duoShops } = splitDraftToTierShops(merged);
    expect(singleShops[0].menu_item_ids).toEqual(['menu-single']);
    expect(duoShops[0].menu_item_ids).toEqual(['menu-single', 'menu-extra']);
  });

  it('uses single tier as primary and ignores duo-only orgs', () => {
    const singleRows = [
      { id: 's1', org_id: 'org-a', menu_item_ids: ['single-a'] },
      { id: 's2', org_id: 'org-b', menu_item_ids: ['single-b'] },
    ];
    const duoRows = [
      { id: 'd1', org_id: 'org-b', menu_item_ids: ['duo-b-1', 'duo-b-2'] },
      { id: 'd2', org_id: 'org-c', menu_item_ids: ['duo-c-1', 'duo-c-2'] },
    ];

    const merged = mergeLoadedShopsToDraft(singleRows, duoRows);
    expect(merged).toHaveLength(2);
    expect(merged.find((s) => s.org_id === 'org-a')).toMatchObject({
      single_menu_item_id: 'single-a',
      duo_extra_menu_item_id: '',
    });
    expect(merged.find((s) => s.org_id === 'org-b')).toMatchObject({
      single_menu_item_id: 'single-b',
      duo_extra_menu_item_id: 'duo-b-2',
    });
    expect(merged.find((s) => s.org_id === 'org-c')).toBeUndefined();
  });

  it('caps legacy single rows at 5', () => {
    const singleRows = Array.from({ length: 7 }, (_, i) => ({
      id: `s${i}`,
      org_id: `org-${i}`,
      menu_item_ids: [`single-${i}`],
    }));
    expect(mergeLoadedShopsToDraft(singleRows, [])).toHaveLength(5);
  });

  it('does not merge disjoint single and duo lists into 10 shops', () => {
    const singleRows = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      org_id: `single-${i}`,
      menu_item_ids: [`m${i}`],
    }));
    const duoRows = Array.from({ length: 5 }, (_, i) => ({
      id: `d${i}`,
      org_id: `duo-${i}`,
      menu_item_ids: [`m${i}a`, `m${i}b`],
    }));
    expect(mergeLoadedShopsToDraft(singleRows, duoRows)).toHaveLength(5);
  });
});
