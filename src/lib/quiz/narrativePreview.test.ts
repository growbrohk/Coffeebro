import { describe, expect, it } from 'vitest';
import { narrativeTextBlockForShare } from '@/lib/quiz/narrativePreview';

describe('narrativeTextBlockForShare', () => {
  it('collapses whitespace into one block', () => {
    const t = narrativeTextBlockForShare('DIR');
    expect(t).toContain('These frogs are DIRTY');
    expect(t).not.toContain('\n\n');
  });
});
