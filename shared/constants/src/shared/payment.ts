export const CURRENCIES = ['INR'] as const;
export type TCurrency = (typeof CURRENCIES)[number];

export const CURRENCIES_MAP = Object.fromEntries(
  CURRENCIES.map((currency) => [currency, currency] as const),
) as { readonly [K in TCurrency]: K };
export type TCurrencyMap = typeof CURRENCIES_MAP;
