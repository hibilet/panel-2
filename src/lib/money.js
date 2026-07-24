import { formatCurrency } from "../localization";
import { canSeeMoney } from "./capabilities";
import { getViewer, viewerSeesMoney } from "./viewer";

// The viewer lives in lib/viewer so the shared currency formatter can read it
// without importing this module. Re-exported here for existing callers.
export { setViewer, getViewer } from "./viewer";

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
	// Permission before null: the API nulls takings for a hidden viewer, so
	// checking null first would render "—" (no data) instead of "•••" (masked).
	if (!canSeeMoney(account)) return MASK;
	if (value == null) return "—";
	return formatMoney(value, currency);
};

/**
 * Drop-in replacement for formatCurrency that respects the viewer's
 * permission. Same signature, so money cells only need their import changed.
 */
export const maskedCurrency = (value, currency) => {
	if (!viewerSeesMoney()) return MASK;
	if (value == null) return "—";
	return formatCurrency(value, currency);
};

/** Same gate for money-adjacent values that are already rendered. */
export const maskIfHidden = (rendered, account = getViewer()) =>
	canSeeMoney(account) ? rendered : MASK;
