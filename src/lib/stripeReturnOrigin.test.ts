import { describe, expect, it } from 'vitest';
import { resolveStripeReturnBase } from '@/lib/stripeReturnOrigin';

describe('resolveStripeReturnBase', () => {
  const appUrl = 'https://www.coffee-bro.com';

  it('prefers body origin when allowlisted (apex)', () => {
    expect(resolveStripeReturnBase('https://coffee-bro.com', null, appUrl)).toBe(
      'https://coffee-bro.com',
    );
  });

  it('prefers body origin when allowlisted (www)', () => {
    expect(resolveStripeReturnBase('https://www.coffee-bro.com', null, appUrl)).toBe(
      'https://www.coffee-bro.com',
    );
  });

  it('falls back to Origin header when body origin missing', () => {
    expect(resolveStripeReturnBase(null, 'https://coffee-bro.com', appUrl)).toBe(
      'https://coffee-bro.com',
    );
  });

  it('allows localhost for dev', () => {
    expect(resolveStripeReturnBase('http://localhost:5173', null, appUrl)).toBe(
      'http://localhost:5173',
    );
  });

  it('rejects unknown origins and falls back to APP_URL', () => {
    expect(resolveStripeReturnBase('https://evil.example.com', null, appUrl)).toBe(
      'https://www.coffee-bro.com',
    );
  });

  it('rejects http on production domains', () => {
    expect(resolveStripeReturnBase('http://coffee-bro.com', null, appUrl)).toBe(
      'https://www.coffee-bro.com',
    );
  });
});
