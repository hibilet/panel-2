export const EU = new Set([
	"AT",
	"BE",
	"BG",
	"CY",
	"CZ",
	"DE",
	"DK",
	"EE",
	"ES",
	"FI",
	"FR",
	"GR",
	"HR",
	"HU",
	"IE",
	"IT",
	"LT",
	"LU",
	"LV",
	"MT",
	"NL",
	"PL",
	"PT",
	"RO",
	"SE",
	"SI",
	"SK",
]);

export const COUNTRIES = [
	{ value: "AT", label: "Austria" },
	{ value: "BE", label: "Belgium" },
	{ value: "BG", label: "Bulgaria" },
	{ value: "CH", label: "Switzerland" },
	{ value: "CY", label: "Cyprus" },
	{ value: "CZ", label: "Czechia" },
	{ value: "DE", label: "Germany" },
	{ value: "DK", label: "Denmark" },
	{ value: "EE", label: "Estonia" },
	{ value: "ES", label: "Spain" },
	{ value: "FI", label: "Finland" },
	{ value: "FR", label: "France" },
	{ value: "GB", label: "United Kingdom" },
	{ value: "GR", label: "Greece" },
	{ value: "HR", label: "Croatia" },
	{ value: "HU", label: "Hungary" },
	{ value: "IE", label: "Ireland" },
	{ value: "IT", label: "Italy" },
	{ value: "LT", label: "Lithuania" },
	{ value: "LU", label: "Luxembourg" },
	{ value: "LV", label: "Latvia" },
	{ value: "MT", label: "Malta" },
	{ value: "NL", label: "Netherlands" },
	{ value: "NO", label: "Norway" },
	{ value: "PL", label: "Poland" },
	{ value: "PT", label: "Portugal" },
	{ value: "RO", label: "Romania" },
	{ value: "SE", label: "Sweden" },
	{ value: "SI", label: "Slovenia" },
	{ value: "SK", label: "Slovakia" },
	{ value: "TR", label: "Turkey" },
	{ value: "US", label: "United States" },
];

const round2 = (n) => Math.round(n * 100) / 100;

const profile = (seller) =>
	seller?.taxProfile || (EU.has(seller?.country) ? "eu" : "simple");

export const previewVat = ({ seller, buyerCountry, buyerVatId, subtotal }) => {
	if (!seller?.country || seller.defaultRate == null)
		return { mode: "no_seller_config", rate: 0, amount: 0 };

	const s = seller.country.toUpperCase();
	const b = (buyerCountry || "").toUpperCase();
	const r = Number(seller.defaultRate) || 0;
	const prof = profile(seller);

	if (!b)
		return { mode: "standard_fallback", rate: r, amount: round2(subtotal * r) };
	if (b === s)
		return { mode: "standard", rate: r, amount: round2(subtotal * r) };

	if (prof === "eu" && EU.has(b)) {
		if (buyerVatId?.trim())
			return { mode: "reverse_charge", rate: 0, amount: 0 };
		return { mode: "standard_oss_risk", rate: r, amount: round2(subtotal * r) };
	}
	return { mode: "out_of_scope", rate: 0, amount: 0 };
};

export const VAT_MODE_META = {
	standard: {
		color: "bg-slate-100 text-slate-700",
		labelKey: "vat.mode.standard",
	},
	reverse_charge: {
		color: "bg-blue-100 text-blue-800",
		labelKey: "vat.mode.reverseCharge",
	},
	out_of_scope: {
		color: "bg-slate-100 text-slate-500",
		labelKey: "vat.mode.outOfScope",
	},
	standard_oss_risk: {
		color: "bg-amber-100 text-amber-800",
		labelKey: "vat.mode.ossRisk",
	},
	standard_fallback: {
		color: "bg-amber-100 text-amber-800",
		labelKey: "vat.mode.fallback",
	},
	no_seller_config: {
		color: "bg-red-100 text-red-700",
		labelKey: "vat.mode.noConfig",
	},
	legacy: { color: "bg-slate-100 text-slate-500", labelKey: "vat.mode.legacy" },
};

export const vatModeMeta = (mode) =>
	VAT_MODE_META[mode] ?? {
		color: "bg-slate-100 text-slate-500",
		labelKey: "vat.mode.unknown",
	};
