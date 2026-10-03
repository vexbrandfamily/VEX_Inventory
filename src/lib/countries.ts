export interface CountryOption {
  name: string;
  code: string;
  flag: string;
  currency: string;
  currencySymbol: string;
}

const COUNTRY_PHONE_CODES: Record<string, string> = {
  US: '1', GB: '44', CA: '1', AU: '61', DE: '49', FR: '33', IT: '39', ES: '34', NL: '31', BE: '32',
  CH: '41', SE: '46', NO: '47', DK: '45', IE: '353', PT: '351', PL: '48', AE: '971', SA: '966', QA: '974',
  KW: '965', BH: '973', OM: '968', EG: '20', JO: '962', LB: '961', IQ: '964', TR: '90', IN: '91', CN: '86',
  JP: '81', KR: '82', SG: '65', MY: '60', ID: '62', PH: '63', TH: '66', VN: '84', PK: '92', BD: '880',
  NG: '234', KE: '254', GH: '233', ZA: '27', TZ: '255', UG: '256', ET: '251', MA: '212', DZ: '213', TN: '216',
  BR: '55', MX: '52', AR: '54', CO: '57', CL: '56', NZ: '64', RU: '7', UA: '380', IL: '972', HK: '852',
};

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

/** Major currencies always available as overrides */
export const MAJOR_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
];

export const COUNTRIES: CountryOption[] = [
  { name: 'United States', code: 'US', flag: '🇺🇸', currency: 'USD', currencySymbol: '$' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', currency: 'CAD', currencySymbol: 'C$' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', currency: 'AUD', currencySymbol: 'A$' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€' },
  { name: 'France', code: 'FR', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', currency: 'EUR', currencySymbol: '€' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', currency: 'EUR', currencySymbol: '€' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', currency: 'CHF', currencySymbol: 'Fr' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', currency: 'SEK', currencySymbol: 'kr' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', currency: 'NOK', currencySymbol: 'kr' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', currency: 'DKK', currencySymbol: 'kr' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', currency: 'EUR', currencySymbol: '€' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', currency: 'EUR', currencySymbol: '€' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', currency: 'PLN', currencySymbol: 'zł' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', currency: 'SAR', currencySymbol: '﷼' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', currency: 'QAR', currencySymbol: '﷼' },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼', currency: 'KWD', currencySymbol: 'د.ك' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', currency: 'BHD', currencySymbol: '.د.ب' },
  { name: 'Oman', code: 'OM', flag: '🇴🇲', currency: 'OMR', currencySymbol: '﷼' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', currency: 'EGP', currencySymbol: 'E£' },
  { name: 'Jordan', code: 'JO', flag: '🇯🇴', currency: 'JOD', currencySymbol: 'د.ا' },
  { name: 'Lebanon', code: 'LB', flag: '🇱🇧', currency: 'LBP', currencySymbol: 'ل.ل' },
  { name: 'Iraq', code: 'IQ', flag: '🇮🇶', currency: 'IQD', currencySymbol: 'ع.د' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', currency: 'TRY', currencySymbol: '₺' },
  { name: 'India', code: 'IN', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹' },
  { name: 'China', code: 'CN', flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', currency: 'JPY', currencySymbol: '¥' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', currency: 'KRW', currencySymbol: '₩' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', currency: 'SGD', currencySymbol: 'S$' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', currency: 'MYR', currencySymbol: 'RM' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', currency: 'IDR', currencySymbol: 'Rp' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', currency: 'PHP', currencySymbol: '₱' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', currency: 'THB', currencySymbol: '฿' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', currency: 'VND', currencySymbol: '₫' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', currency: 'PKR', currencySymbol: '₨' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', currency: 'BDT', currencySymbol: '৳' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', currency: 'GHS', currencySymbol: '₵' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', currency: 'TZS', currencySymbol: 'TSh' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', currency: 'UGX', currencySymbol: 'USh' },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', currency: 'ETB', currencySymbol: 'Br' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', currency: 'MAD', currencySymbol: 'د.م.' },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿', currency: 'DZD', currencySymbol: 'د.ج' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', currency: 'TND', currencySymbol: 'د.ت' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', currency: 'MXN', currencySymbol: 'Mex$' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', currency: 'ARS', currencySymbol: '$' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', currency: 'COP', currencySymbol: '$' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', currency: 'CLP', currencySymbol: '$' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', currency: 'NZD', currencySymbol: 'NZ$' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', currency: 'RUB', currencySymbol: '₽' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', currency: 'UAH', currencySymbol: '₴' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', currency: 'ILS', currencySymbol: '₪' },
  { name: 'Hong Kong', code: 'HK', flag: '🇭🇰', currency: 'HKD', currencySymbol: 'HK$' },
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCountryByPhoneCode(phoneCode: string): CountryOption | undefined {
  const countryCode = Object.entries(COUNTRY_PHONE_CODES).find(([, code]) => code === phoneCode)?.[0];
  return countryCode ? getCountryByCode(countryCode) : undefined;
}

export function getCurrencySymbol(currencyCode: string): string {
  const major = MAJOR_CURRENCIES.find((c) => c.code === currencyCode);
  if (major) return major.symbol;
  const country = COUNTRIES.find((c) => c.currency === currencyCode);
  return country?.currencySymbol ?? currencyCode;
}

/** Merge country default currency with major currencies (unique by code) */
export function getAvailableCurrencies(countryCode?: string): CurrencyOption[] {
  const map = new Map<string, CurrencyOption>();
  for (const c of MAJOR_CURRENCIES) {
    map.set(c.code, c);
  }
  if (countryCode) {
    const country = getCountryByCode(countryCode);
    if (country && !map.has(country.currency)) {
      map.set(country.currency, {
        code: country.currency,
        symbol: country.currencySymbol,
        name: `${country.name} (${country.currency})`,
      });
    }
  }
  return Array.from(map.values());
}

export function formatMoney(amount: number, currencyCode?: string | null): string {
  const code = currencyCode || 'USD';
  const symbol = getCurrencySymbol(code);
  const formatted = Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
