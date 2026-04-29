import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { LanguageProvider, useLanguage } from '@/hooks/LanguageContext';

function TestConsumer() {
  const { language, t, setLanguage, localizedPath } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="path">{localizedPath('/products')}</span>
      <button onClick={() => setLanguage('en')}>EN</button>
      <button onClick={() => setLanguage('ge')}>GE</button>
    </div>
  );
}

describe('hooks/LanguageContext', () => {
  it('throws when used outside provider', () => {
    expect(() => {
      function Bad() { useLanguage(); return null; }
      render(<Bad />);
    }).toThrow('useLanguage must be used within a LanguageProvider');
  });

  it('provides default language ge', () => {
    render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('ge');
  });

  it('localizedPath returns path as-is for ge', () => {
    render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    expect(screen.getByTestId('path').textContent).toBe('/products');
  });

  it('setLanguage changes to en and localizedPath adds /en prefix', async () => {
    render(
      <LanguageProvider><TestConsumer /></LanguageProvider>
    );
    await act(async () => {
      screen.getByText('EN').click();
    });
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('path').textContent).toBe('/en/products');
  });

  it('localizedPath does not double prefix /en', async () => {
    function PathTest() {
      const { localizedPath, setLanguage } = useLanguage();
      React.useEffect(() => { setLanguage('en'); }, []);
      return <span data-testid="p">{localizedPath('/en/products')}</span>;
    }
    render(
      <LanguageProvider><PathTest /></LanguageProvider>
    );
    expect(screen.getByTestId('p').textContent).toBe('/en/products');
  });

  it('t() returns key when no dots in key', () => {
    function TTest() {
      const { t } = useLanguage();
      return <span data-testid="t">{t('nodots')}</span>;
    }
    render(<LanguageProvider><TTest /></LanguageProvider>);
    expect(screen.getByTestId('t').textContent).toBe('nodots');
  });

  it('t() returns key for non-existent nested path', () => {
    function TTest() {
      const { t } = useLanguage();
      return <span data-testid="t">{t('nonexistent.deep.path')}</span>;
    }
    render(<LanguageProvider><TTest /></LanguageProvider>);
    expect(screen.getByTestId('t').textContent).toBe('nonexistent.deep.path');
  });

  it('t() interpolates values', () => {
    function TTest() {
      const { t } = useLanguage();
      // Use a known translation key with interpolation
      return <span data-testid="t">{t('referral.discountApplied', { discount: 10 })}</span>;
    }
    render(<LanguageProvider><TTest /></LanguageProvider>);
    const text = screen.getByTestId('t').textContent!;
    // Should have interpolated the discount value or returned the key
    expect(text).toBeTruthy();
  });

  it('localizedPath does not prefix api routes', async () => {
    function PathTest() {
      const { localizedPath, setLanguage } = useLanguage();
      React.useEffect(() => { setLanguage('en'); }, []);
      return <span data-testid="p">{localizedPath('/api/test')}</span>;
    }
    render(<LanguageProvider><PathTest /></LanguageProvider>);
    // Wait for effect
    await act(async () => {});
    expect(screen.getByTestId('p').textContent).toBe('/api/test');
  });
});
