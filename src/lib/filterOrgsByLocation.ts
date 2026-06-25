import type { Org } from '@/hooks/useOrgs';

export function filterOrgsForPackage(
  orgs: Org[],
  districts: string[],
  mtrStations: string[],
): Org[] {
  return orgs.filter((o) => {
    if (mtrStations.length > 0) return o.mtr_station && mtrStations.includes(o.mtr_station);
    if (districts.length > 0) return o.district && districts.includes(o.district);
    return true;
  });
}

export function orgMatchesPackageLocation(
  org: Org,
  districts: string[],
  mtrStations: string[],
): boolean {
  if (mtrStations.length > 0) {
    return Boolean(org.mtr_station && mtrStations.includes(org.mtr_station));
  }
  if (districts.length > 0) {
    return Boolean(org.district && districts.includes(org.district));
  }
  return true;
}

export function formatOrgOptionLabel(org: Org): string {
  return org.mtr_station ? `${org.org_name} (${org.mtr_station})` : org.org_name;
}
