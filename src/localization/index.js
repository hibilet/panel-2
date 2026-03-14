import dayjs from "dayjs";
import { getLang, setLang } from "../lib/storage";

import de from "./de.json";
import en from "./en.json";
import fr from "./fr.json";
import nl from "./nl.json";
import tr from "./tr.json";

import "dayjs/locale/de.js";
import "dayjs/locale/en.js";
import "dayjs/locale/fr.js";
import "dayjs/locale/nl.js";
import "dayjs/locale/tr.js";

const locales = ["de", "en", "fr", "nl", "tr"];
const DEFAULT_CURRENCY = "eur";
let locale = getLang() || "en";

locale = locales.includes(locale) ? locale : setLang("en");
dayjs.locale(locale);

const dictionary = { de, en, fr, nl, tr };

const strings = (key, variables) => {
	if (!key) return "";
	const text = dictionary[locale]?.[key];
	if (!text) {
		console.warn("missing-translation", `${locale}.${key}`);
		return key;
	}
	try {
		const vars = variables || [];
		return text.replace(/\$[0-9]+/g, (match) => {
			const index = parseInt(match.substring(1), 10);
			return vars[index] != null ? String(vars[index]) : match;
		});
	} catch {
		console.warn("missing-variables", `${locale}.${key}`);
		return text;
	}
};

const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
	if (value == null) return "—";
	const curr = typeof currency === "string" ? currency : DEFAULT_CURRENCY;
	return new Intl.NumberFormat("en", {
		style: "currency",
		currency: curr.toUpperCase(),
	}).format(value);
};

export default strings;
export { dictionary, formatCurrency, DEFAULT_CURRENCY, locales };
