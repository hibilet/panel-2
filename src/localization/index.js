import { viewerSeesMoney } from "../lib/viewer";
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

// Masked when the viewer lacks panel.money (an event manager, say). This is
// the one place every monetary figure in the panel is formatted - dashboard
// tiles, charts, tables, reports - so the permission is applied here rather
// than at ~62 call sites where it would inevitably be missed.
//
// Product PRICES do not come through here (ticket prices use their own
// formatter), which is deliberate: someone configuring an event needs to see
// what a ticket costs without seeing what the event earned.
//
// Display gate. The API is the authority - it now nulls takings for a viewer
// without panel.money - but a hidden viewer must read "•••" (withheld), not
// "—" (no data), so the permission is checked BEFORE the null. Otherwise an
// API-nulled figure looks like an empty cell instead of a masked one.
const MONEY_MASK = "•••";

const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
	if (!viewerSeesMoney()) return MONEY_MASK;
	if (value == null) return "—";
	const curr = typeof currency === "string" ? currency : DEFAULT_CURRENCY;
	return new Intl.NumberFormat("en", {
		style: "currency",
		currency: curr.toUpperCase(),
	}).format(value);
};

export default strings;
export { DEFAULT_CURRENCY, dictionary, formatCurrency, locales };
