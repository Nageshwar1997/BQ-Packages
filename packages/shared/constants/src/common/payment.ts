export const CURRENCIES = ['INR'] as const;

export const CURRENCIES_MAP = Object.fromEntries(
  CURRENCIES.map((currency) => [currency, currency] as const),
) as { readonly [K in (typeof CURRENCIES)[number]]: K };
