/**
 * Shared offer form logic for both calendar and hunt modes.
 * Single source for validation, build helpers, and form utilities.
 */

import { OFFER_TYPES, type OfferTypeValue } from './offerTypes';

export { OFFER_TYPES, type OfferTypeValue } from './offerTypes';

export type OfferMode = 'calendar' | 'hunt';

export interface OfferFormValues {
  orgId: string;
  offerName: string;
  offerType: OfferTypeValue;
  quantityLimit: number;
  date: string;
  startTime: string;
  endTime: string;
  redeemBeforeTime: string;
  location: string;
  description: string;
  coffeeTypes: string[];
  lat: string;
  lng: string;
}

export interface ValidationResult {
  valid: boolean;
  field?: string;
  message?: string;
}

export function isValidHHMM(value: string): boolean {
  if (!value) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function validateOfferForm(
  mode: OfferMode,
  values: Partial<OfferFormValues>,
  effectiveHuntId?: string
): ValidationResult {
  if (!values.offerName?.trim()) {
    return { valid: false, field: 'offerName', message: 'Offer name is required.' };
  }

  if (!values.orgId) {
    return { valid: false, field: 'orgId', message: 'Please select an organization.' };
  }

  if (mode === 'hunt') {
    if (!effectiveHuntId) {
      return { valid: false, field: 'huntId', message: 'Please select a hunt to add the treasure to.' };
    }
    if (!values.location?.trim()) {
      return { valid: false, field: 'location', message: 'Location is required for hunt mode.' };
    }
    const latNum = values.lat ? parseFloat(values.lat) : NaN;
    const lngNum = values.lng ? parseFloat(values.lng) : NaN;
    if (
      !values.lat?.trim() ||
      !values.lng?.trim() ||
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum)
    ) {
      return { valid: false, field: 'latlng', message: 'Latitude and longitude are required for hunt mode.' };
    }
  } else {
    if (!values.date) {
      return { valid: false, field: 'date', message: 'Please fill in the date.' };
    }
    if (values.startTime && !isValidHHMM(values.startTime)) {
      return { valid: false, field: 'startTime', message: 'Start time must be HH:MM (24-hour, e.g. 09:00).' };
    }
    if (values.endTime && !isValidHHMM(values.endTime)) {
      return { valid: false, field: 'endTime', message: 'End time must be HH:MM (24-hour, e.g. 12:00).' };
    }
    if (values.redeemBeforeTime && !isValidHHMM(values.redeemBeforeTime)) {
      return { valid: false, field: 'redeemBeforeTime', message: 'Redeem before must be HH:MM (24-hour).' };
    }
  }

  return { valid: true };
}

/** Build starts_at/ends_at for hunt from date + times (local time -> UTC ISO) */
export function buildHuntTimestamps(
  date: string,
  startTime: string,
  endTime: string
): { starts_at: string | null; ends_at: string | null } {
  const toUtcIso = (dateStr: string, timeStr: string) => {
    const [y, mo, day] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const local = new Date(y, mo - 1, day, h, min || 0, 0);
    return local.toISOString();
  };
  const startsAt = date && startTime ? toUtcIso(date, startTime) : null;
  const endsAt = date && endTime ? toUtcIso(date, endTime) : null;
  return { starts_at: startsAt, ends_at: endsAt };
}

/** Get offer type label for display */
export function getOfferTypeLabel(offerType: OfferTypeValue): string {
  return OFFER_TYPES.find((o) => o.value === offerType)?.label ?? offerType;
}
