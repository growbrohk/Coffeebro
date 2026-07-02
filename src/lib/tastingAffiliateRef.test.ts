import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTastingCheckoutPath,
  captureAffiliateRef,
  clearAffiliateRef,
  consumePendingReturnTo,
  getStoredAffiliateRef,
  peekPendingReturnTo,
  setPendingReturnTo,
} from './tastingAffiliateRef';

const PACKAGE_ID = '2e052b04-0877-42cc-a539-06c34ef30755';

describe('tastingAffiliateRef', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores and reads affiliate ref from localStorage', () => {
    captureAffiliateRef(PACKAGE_ID, '4EpILTr5');
    expect(getStoredAffiliateRef(PACKAGE_ID)).toBe('4EpILTr5');
  });

  it('expires refs older than 30 days', () => {
    const key = `tasting_affiliate_ref:${PACKAGE_ID}`;
    const staleTs = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ ref: 'staleRef', ts: staleTs }));
    expect(getStoredAffiliateRef(PACKAGE_ID)).toBeNull();
  });

  it('builds checkout path with tier and ref', () => {
    expect(buildTastingCheckoutPath(PACKAGE_ID, 'single', '4EpILTr5')).toBe(
      `/tasting-packages/${PACKAGE_ID}/checkout?tier=single&ref=4EpILTr5`,
    );
  });

  it('manages pending returnTo paths', () => {
    const path = buildTastingCheckoutPath(PACKAGE_ID, 'duo', 'abc');
    setPendingReturnTo(path);
    expect(peekPendingReturnTo()).toBe(path);
    expect(consumePendingReturnTo()).toBe(path);
    expect(peekPendingReturnTo()).toBeNull();
  });

  it('clears affiliate ref', () => {
    captureAffiliateRef(PACKAGE_ID, 'code');
    clearAffiliateRef(PACKAGE_ID);
    expect(getStoredAffiliateRef(PACKAGE_ID)).toBeNull();
  });
});
