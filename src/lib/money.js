import { formatCurrency } from "../localization";
import { canSeeMoney } from "./capabilities";

/**
 * The signed-in account, as a module value.
 *
 * Money is rendered inside table column factories (components/tables/columns)
 * that are plain data and have no React context. Threading the account through
 * every factory and every call site would be a large mechanical change for a
 * display concern, so AppContext publishes the viewer here once on load and the
 * formatters below read it.
 */
let viewer = null;

export const setViewer = (account) => {
	viewer = account ?? null;
};

export const getViewer = () => viewer;

/**
 * Money display, gated on the panel.money permission.
 *
 * Revenue is MASKED rather than removed: an ops person keeps the same screens,
 * row counts and layout, just without the takings. Hiding whole columns would
 * reflow every table and make it obvious which figures are being withheld,
 * which is worse for the people who legitimately can't see them.
 *
 * This is a display gate, not a security boundary - the API is the authority on
 * what data is served. It exists so panels don't show numbers to staff who
 * shouldn't read them, not to keep secrets from someone with devtools.
 */

export const MASK = "•••";

export const formatMoney = (value, currency = "eur") =>
	value != null
		? new Intl.NumberFormat("de-DE", {
				style: "currency",
				currency: (currency || "eur").toUpperCase(),
			}).format(value)
		: "—";

/**
 * Format an amount for `account`, masking it when they may not see money.
 * Null/undefined stays an em dash so "no value" and "not allowed" remain
 * visually distinct.
 */
export const money = (account, value, currency = "eur") => {
	if (value == null) return "—";
	if (!canSeeMoney(account)) return MASK;
	return formatMoney(value, currency);
};

/**
 * Drop-in replacement for formatCurrency that respects the viewer's
 * permission. Same signature, so money cells only need their import changed.
 */
export const maskedCurrency = (value, currency) => {
	if (value == null) return "—";
	if (!canSeeMoney(viewer)) return MASK;
	return formatCurrency(value, currency);
};

/** Same gate for money-adjacent values that are already rendered. */
export const maskIfHidden = (rendered, account = viewer) =>
	canSeeMoney(account) ? rendered : MASK;
