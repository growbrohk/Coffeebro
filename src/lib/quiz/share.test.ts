import { describe, expect, it } from 'vitest';
import { FROG_SHARE_SLUG } from '@/lib/quiz/constants';
import { buildShareText, frogTypeFromShareSlug, getSharePageUrl } from '@/lib/quiz/share';

describe('share helpers', () => {
  it('getSharePageUrl uses slug path', () => {
    expect(getSharePageUrl('https://example.com', 'DIR')).toBe(
      'https://example.com/q/share/dirty.html',
    );
  });

  it('getSharePageUrl strips trailing slash on origin', () => {
    expect(getSharePageUrl('https://example.com/', 'ESP')).toBe(
      'https://example.com/q/share/espresso.html',
    );
  });

  it('buildShareText includes share URL and frog name', () => {
    const t = buildShareText('DIR', 'https://app.test');
    expect(t).toContain('Dirty Frog');
    expect(t).toContain('https://app.test/q/share/dirty.html');
  });

  it('frogTypeFromShareSlug maps slug to type', () => {
    expect(frogTypeFromShareSlug('dirty')).toBe('DIR');
    expect(frogTypeFromShareSlug('cold-brew')).toBe('CLD');
    expect(frogTypeFromShareSlug('unknown')).toBeNull();
  });

  it('FROG_SHARE_SLUG has one entry per frog type', () => {
    const slugs = Object.values(FROG_SHARE_SLUG);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

});
