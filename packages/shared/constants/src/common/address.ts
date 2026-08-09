export const STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (National Capital Territory of Delhi)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const STATES_AND_UTS_MAP = Object.fromEntries(
  STATES_AND_UTS.map((stateOrUT) => [stateOrUT, stateOrUT] as const),
) as {
  readonly [K in (typeof STATES_AND_UTS)[number]]: K;
};

export const COUNTRIES = ['India'] as const;

export const COUNTRIES_MAP = Object.fromEntries(
  COUNTRIES.map((country) => [country, country] as const),
) as { readonly [K in (typeof COUNTRIES)[number]]: K };
