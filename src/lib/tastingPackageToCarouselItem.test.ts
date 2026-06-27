import { describe, expect, it } from 'vitest';
import type { TastingPackage, TastingPackageShop, TastingPackageTier } from '@/types/tastingPackage';
import {
  packageShopsForMap,
  tastingPackageShopsToMapItems,
} from '@/lib/tastingPackageToCarouselItem';

function shop(
  id: string,
  tier: TastingPackageTier,
  sortOrder: number,
  coords?: { lat: number; lng: number },
): TastingPackageShop {
  return {
    id: `shop-${id}`,
    org_id: id,
    tier,
    sort_order: sortOrder,
    org_name: `Shop ${id}`,
    org_logo_url: null,
    org_preview_photo_url: null,
    lat: coords?.lat ?? 22.28,
    lng: coords?.lng ?? 114.15,
    location: null,
    items: [],
  };
}

function pkg(shops: TastingPackageShop[]): TastingPackage {
  return {
    id: 'pkg-1',
    title: 'Test package',
    description: null,
    hk_areas: [],
    districts: [],
    mtr_stations: [],
    cover_image_url: null,
    status: 'published',
    is_active: true,
    single_price_cents: 7700,
    duo_price_cents: 14700,
    redeem_valid_days: 30,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    shops,
  };
}

describe('packageShopsForMap', () => {
  it('caps stale single rows at 5', () => {
    const shops = Array.from({ length: 7 }, (_, i) => shop(`single-${i}`, 'single', i));
    expect(packageShopsForMap(pkg(shops))).toHaveLength(5);
  });

  it('uses single tier only when both tiers exist', () => {
    const shops = [
      ...Array.from({ length: 5 }, (_, i) => shop(`single-${i}`, 'single', i)),
      ...Array.from({ length: 5 }, (_, i) => shop(`duo-${i}`, 'duo', i)),
    ];
    expect(packageShopsForMap(pkg(shops))).toHaveLength(5);
  });

  it('falls back to duo tier when no single shops', () => {
    const shops = Array.from({ length: 5 }, (_, i) => shop(`duo-${i}`, 'duo', i));
    expect(packageShopsForMap(pkg(shops))).toHaveLength(5);
  });
});

describe('tastingPackageShopsToMapItems', () => {
  it('returns 5 pins for duo-only package with 5 shops', () => {
    const shops = Array.from({ length: 5 }, (_, i) => shop(`duo-${i}`, 'duo', i));
    expect(tastingPackageShopsToMapItems(pkg(shops))).toHaveLength(5);
  });

  it('caps stale 7 duo shops to 5 map pins', () => {
    const shops = Array.from({ length: 7 }, (_, i) => shop(`duo-${i}`, 'duo', i));
    expect(tastingPackageShopsToMapItems(pkg(shops))).toHaveLength(5);
  });

  it('dedupes when single and duo share the same orgs', () => {
    const shops = Array.from({ length: 5 }, (_, i) => shop(`org-${i}`, 'single', i)).concat(
      Array.from({ length: 5 }, (_, i) => shop(`org-${i}`, 'duo', i)),
    );
    expect(tastingPackageShopsToMapItems(pkg(shops))).toHaveLength(5);
  });

  it('shows 5 pins when single and duo share the same orgs', () => {
    const single = ['a', 'b', 'c', 'd', 'e'].map((id, i) => shop(id, 'single', i));
    const duo = ['c', 'd', 'e', 'f', 'g'].map((id, i) => shop(id, 'duo', i));
    expect(tastingPackageShopsToMapItems(pkg([...single, ...duo]))).toHaveLength(5);
  });

  it('excludes shops missing coordinates', () => {
    const shops = [
      shop('a', 'duo', 0),
      { ...shop('b', 'duo', 1), lat: null, lng: null },
      { ...shop('c', 'duo', 2), lat: Number.NaN, lng: 114.15 },
    ];
    expect(tastingPackageShopsToMapItems(pkg(shops))).toHaveLength(1);
  });
});
