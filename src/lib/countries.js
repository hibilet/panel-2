// ISO 3166-1 numeric -> alpha-2, for matching world-atlas topojson `id`
// (numeric) to our billing-country codes (alpha-2). Europe-heavy + common
// markets; countries not listed simply render uncolored (we have no data).
export const NUMERIC_TO_A2 = {
	276: "DE", 40: "AT", 756: "CH", 528: "NL", 250: "FR", 56: "BE", 826: "GB",
	380: "IT", 724: "ES", 620: "PT", 372: "IE", 442: "LU", 208: "DK", 752: "SE",
	578: "NO", 246: "FI", 352: "IS", 616: "PL", 203: "CZ", 703: "SK", 348: "HU",
	642: "RO", 100: "BG", 300: "GR", 191: "HR", 705: "SI", 688: "RS", 70: "BA",
	807: "MK", 8: "AL", 499: "ME", 470: "MT", 196: "CY", 233: "EE", 428: "LV",
	440: "LT", 792: "TR", 804: "UA", 112: "BY", 643: "RU", 840: "US", 124: "CA",
	484: "MX", 76: "BR", 32: "AR", 36: "AU", 554: "NZ", 392: "JP", 410: "KR",
	156: "CN", 356: "IN", 784: "AE", 682: "SA", 818: "EG", 710: "ZA", 504: "MA",
};

export const A2_NAME = {
	DE: "Germany", AT: "Austria", CH: "Switzerland", NL: "Netherlands", FR: "France",
	BE: "Belgium", GB: "United Kingdom", IT: "Italy", ES: "Spain", PT: "Portugal",
	IE: "Ireland", LU: "Luxembourg", DK: "Denmark", SE: "Sweden", NO: "Norway",
	FI: "Finland", IS: "Iceland", PL: "Poland", CZ: "Czechia", SK: "Slovakia",
	HU: "Hungary", RO: "Romania", BG: "Bulgaria", GR: "Greece", HR: "Croatia",
	SI: "Slovenia", RS: "Serbia", TR: "Turkey", US: "United States", CA: "Canada",
};

export const countryName = (a2) => A2_NAME[a2] ?? a2;
