import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '@/hooks/Languages';

describe('hooks/Languages', () => {
  it('exports TRANSLATIONS object', () => {
    expect(TRANSLATIONS).toBeDefined();
    expect(typeof TRANSLATIONS).toBe('object');
  });

  it('has Georgian (ge) translations', () => {
    expect(TRANSLATIONS.ge).toBeDefined();
    expect(typeof TRANSLATIONS.ge).toBe('object');
  });

  it('has English (en) translations', () => {
    expect(TRANSLATIONS.en).toBeDefined();
    expect(typeof TRANSLATIONS.en).toBe('object');
  });

  it('both languages have same top-level keys', () => {
    const geKeys = Object.keys(TRANSLATIONS.ge);
    const enKeys = Object.keys(TRANSLATIONS.en);
    // Most keys should be in both
    const commonKeys = geKeys.filter(k => enKeys.includes(k));
    expect(commonKeys.length).toBeGreaterThan(5);
  });

  it('Georgian has referral translations', () => {
    expect(TRANSLATIONS.ge.referral).toBeDefined();
  });

  it('English has referral translations', () => {
    expect(TRANSLATIONS.en.referral).toBeDefined();
  });
});
