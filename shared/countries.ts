export interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRY_DEFINITIONS = [
  ["AR", "Argentina"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["BH", "Bahrain"],
  ["BD", "Bangladesh"],
  ["BE", "Belgium"],
  ["BO", "Bolivia"],
  ["BR", "Brazil"],
  ["BG", "Bulgaria"],
  ["CA", "Canada"],
  ["CL", "Chile"],
  ["CN", "China"],
  ["CO", "Colombia"],
  ["CR", "Costa Rica"],
  ["HR", "Croatia"],
  ["CU", "Cuba"],
  ["CZ", "Czech Republic"],
  ["DK", "Denmark"],
  ["DO", "Dominican Republic"],
  ["EC", "Ecuador"],
  ["EG", "Egypt"],
  ["SV", "El Salvador"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GH", "Ghana"],
  ["GR", "Greece"],
  ["GT", "Guatemala"],
  ["HN", "Honduras"],
  ["HK", "Hong Kong"],
  ["HU", "Hungary"],
  ["IS", "Iceland"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IR", "Iran"],
  ["IQ", "Iraq"],
  ["IE", "Ireland"],
  ["IL", "Israel"],
  ["IT", "Italy"],
  ["JM", "Jamaica"],
  ["JP", "Japan"],
  ["JO", "Jordan"],
  ["KE", "Kenya"],
  ["KW", "Kuwait"],
  ["LV", "Latvia"],
  ["LB", "Lebanon"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MY", "Malaysia"],
  ["MX", "Mexico"],
  ["MA", "Morocco"],
  ["NP", "Nepal"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["NG", "Nigeria"],
  ["NO", "Norway"],
  ["OM", "Oman"],
  ["PK", "Pakistan"],
  ["PA", "Panama"],
  ["PY", "Paraguay"],
  ["PE", "Peru"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["PR", "Puerto Rico"],
  ["QA", "Qatar"],
  ["RO", "Romania"],
  ["RU", "Russia"],
  ["SA", "Saudi Arabia"],
  ["RS", "Serbia"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["SI", "Slovenia"],
  ["ZA", "South Africa"],
  ["KR", "South Korea"],
  ["ES", "Spain"],
  ["LK", "Sri Lanka"],
  ["SE", "Sweden"],
  ["CH", "Switzerland"],
  ["TW", "Taiwan"],
  ["TH", "Thailand"],
  ["TN", "Tunisia"],
  ["TR", "Turkey"],
  ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["UY", "Uruguay"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"]
] as const;

const flagFromCode = (code: string): string =>
  code
    .toUpperCase()
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");

export const COUNTRIES: Country[] = COUNTRY_DEFINITIONS.map(([code, name]) => ({
  code,
  name,
  flag: flagFromCode(code)
}));

export const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.code, country]));

export const getCountryByCode = (countryCode: string): Country | undefined =>
  COUNTRY_MAP.get(countryCode.toUpperCase());
