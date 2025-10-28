/**
 * Georgian Bank Codes and IBAN Prefixes
 * Based on SWIFT/BIC codes used in Georgia
 */

export interface GeorgianBank {
  code: string; // SWIFT/BIC code
  name: string;
  nameEn: string;
  ibanPrefix: string[]; // IBAN prefixes (after GE and 2 check digits)
}

export const GEORGIAN_BANKS: GeorgianBank[] = [
  {
    code: 'BAGAGE22',
    name: 'საქართველოს ბანკი',
    nameEn: 'Bank of Georgia',
    ibanPrefix: ['BG'], // GE**BG...
  },
  {
    code: 'TBCBGE22',
    name: 'თიბისი ბანკი',
    nameEn: 'TBC Bank',
    ibanPrefix: ['TB'], // GE**TB...
  },
  {
    code: 'LBRTGE22',
    name: 'ლიბერთი ბანკი',
    nameEn: 'Liberty Bank',
    ibanPrefix: ['LB'], // GE**LB...
  },
  {
    code: 'CCTBGE22',
    name: 'კრედო ბანკი',
    nameEn: 'Credo Bank',
    ibanPrefix: ['CC'], // GE**CC...
  },
  {
    code: 'TERGGE22',
    name: 'ტერა ბანკი',
    nameEn: 'Terabank',
    ibanPrefix: ['TE'], // GE**TE...
  },
  {
    code: 'PSBKGE22',
    name: 'პაშა ბანკი',
    nameEn: 'Pasha Bank Georgia',
    ibanPrefix: ['PS'], // GE**PS...
  },
  {
    code: 'BASISGE22',
    name: 'ბაზის ბანკი',
    nameEn: 'Basis Bank',
    ibanPrefix: ['BS', 'BA'], // GE**BS... or GE**BA...
  },
  {
    code: 'CITOGE22',
    name: 'ვი თი ბი ბანკი',
    nameEn: 'VTB Bank Georgia',
    ibanPrefix: ['VT'], // GE**VT...
  },
  {
    code: 'PROCGE22',
    name: 'პროკრედიტ ბანკი',
    nameEn: 'ProCredit Bank',
    ibanPrefix: ['PC'], // GE**PC...
  },
  {
    code: 'MIBGGE22',
    name: 'მიბ ბანკი',
    nameEn: 'MIB Bank',
    ibanPrefix: ['MI'], // GE**MI...
  },
  {
    code: 'FZRBGE22',
    name: 'ფინკა ბანკი',
    nameEn: 'Finca Bank',
    ibanPrefix: ['FI'], // GE**FI...
  },
  {
    code: 'ATLAGE22',
    name: 'ისი ბანკი',
    nameEn: 'Isi Bank',
    ibanPrefix: ['IS'], // GE**IS...
  },
  {
    code: 'HABAGE22',
    name: 'ჰალიკ ბანკი',
    nameEn: 'Halyk Bank Georgia',
    ibanPrefix: ['HA', 'HB'], // GE**HA... or GE**HB...
  },
];

/**
 * Detect bank code from Georgian IBAN
 * @param iban - Georgian IBAN (format: GE00XX...)
 * @returns Bank code (SWIFT/BIC) or null if not found
 */
export function detectBankFromIban(iban: string): string | null {
  if (!iban || typeof iban !== 'string') {
    return null;
  }

  // Normalize IBAN - remove spaces and convert to uppercase
  const normalizedIban = iban.replace(/\s/g, '').toUpperCase();

  // Check if it's a valid Georgian IBAN format (GE + 2 digits + 2 letters + ...)
  if (!normalizedIban.match(/^GE\d{2}[A-Z]{2}/)) {
    return null;
  }

  // Extract bank code (2 letters after GE and 2 check digits)
  const bankPrefix = normalizedIban.substring(4, 6);

  // Find matching bank
  const bank = GEORGIAN_BANKS.find((b) =>
    b.ibanPrefix.includes(bankPrefix)
  );

  return bank ? bank.code : null;
}

/**
 * Get bank info by code
 */
export function getBankByCode(code: string): GeorgianBank | null {
  return GEORGIAN_BANKS.find((b) => b.code === code) || null;
}

/**
 * Get bank info by IBAN
 */
export function getBankByIban(iban: string): GeorgianBank | null {
  const code = detectBankFromIban(iban);
  return code ? getBankByCode(code) : null;
}

/**
 * Validate Georgian IBAN format
 */
export function isValidGeorgianIban(iban: string): boolean {
  if (!iban || typeof iban !== 'string') {
    return false;
  }

  const normalizedIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Georgian IBAN format: GE + 2 check digits + 2 bank letters + 16 digits
  // Total length: 22 characters
  return /^GE\d{2}[A-Z]{2}\d{16}$/.test(normalizedIban);
}

/**
 * Format IBAN for display (add spaces every 4 characters)
 */
export function formatIban(iban: string): string {
  if (!iban) return '';
  const normalized = iban.replace(/\s/g, '').toUpperCase();
  return normalized.match(/.{1,4}/g)?.join(' ') || normalized;
}
