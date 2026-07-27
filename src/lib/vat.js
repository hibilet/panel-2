import { countryName, locale } from "../localization";

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

const COUNTRY_CODES = [
	"AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
	"GB", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "NO",
	"PL", "PT", "RO", "SE", "SI", "SK", "TR", "US",
];

// Names come from Intl, so the list reads in the panel's language and sorts
// by that language rather than by the English name.
export const COUNTRIES = COUNTRY_CODES.map((value) => ({
	value,
	label: countryName(value),
})).sort((a, b) => a.label.localeCompare(b.label, locale));

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

	if (
		prof === "eu"
		&& b
		&& b !== s
		&& EU.has(b)
		&& buyerVatId?.trim()
	) {
		return { mode: "reverse_charge", rate: 0, amount: 0 };
	}
	return { mode: "standard", rate: r, amount: round2(subtotal * r) };
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
