// Mirror of api/libs/capabilities.js. Keep in sync.
// 9999 = unlimited (UI shows "Unlimited" label).

import strings from "../localization";

export const UNLIMITED = 9999;

// Panel-wide AI kill switch. Every ai.* capability reads false, so all the
// Can-gated AI surfaces stay hidden whatever a realm or account has stored.
// FAMILIES deliberately still lists "ai": the realm form builds its features
// payload from it, and dropping the key there would blank stored realm data
// on every save. Flip to false to bring the AI tools back.
export const AI_HIDDEN = true;

const isAiKey = (key) => key === "ai" || key.startsWith("ai.");

// Render-time filter for the editors that list CAPABILITIES/FAMILIES. Those
// lists stay canonical so the save paths keep posting stored ai.* values back
// untouched - only the rows stop being drawn.
export const hiddenKey = (key) => AI_HIDDEN && isAiKey(key);

// Capability display names live in the dictionary (capability.<key>) rather
// than on the spec, so the permission editors read in the panel's language.
export const capabilityLabel = (key) => strings(`capability.${key}`);

export const CAPABILITIES = {
	"ai.tips": { type: "bool", default: false },
	"ai.image.enhance": {
		type: "bool",
		default: false,
	},
	"ai.report.summary": {
		type: "bool",
		default: false,
	},

	"reporting.sales": {
		type: "bool",
		default: false,
	},
	"reporting.churn": {
		type: "bool",
		default: false,
	},

	"branding.disable": {
		type: "bool",
		default: false,
	},

	channels: { type: "number", default: 0 },
	sales: { type: "number", default: 0 },
	reservations: { type: "number", default: 0 },
	links: { type: "number", default: 0 },
	giveaways: { type: "bool", default: false },

	// panel.*: what a person may SEE, rather than what their plan includes.
	// Driven by realm staff roles and per-account overrides, never by tiers.
	// All default true, so nobody loses access until a key is turned off.
	"panel.dashboard": { type: "bool", default: true },
	"panel.money": { type: "bool", default: true },
	"panel.sales": { type: "bool", default: true },
	"panel.transactions": {
		type: "bool",
		default: true,
	},
	"panel.invoices": { type: "bool", default: true },
	"panel.reports": { type: "bool", default: true },
	"panel.accounts": { type: "bool", default: true },
	"panel.settings": { type: "bool", default: true },
	"panel.venues": { type: "bool", default: true },
	"panel.links": { type: "bool", default: true },
	"panel.analytics": { type: "bool", default: true },
};

export const FAMILIES = [
	"ai",
	"reporting",
	"branding",
	"channels",
	"sales",
	"reservations",
	"links",
	"giveaways",
	"panel",
];

export const familyOf = (key) => key.split(".")[0];

const offValueFor = (type) => (type === "number" ? 0 : false);

export const can = (account, key) => {
	const spec = CAPABILITIES[key];
	if (!spec) return false;
	if (AI_HIDDEN && isAiKey(key)) return false;
	const caps = account?.capabilities;
	if (!caps) return spec.default;
	const value = caps[key];
	if (value === undefined) return spec.default;
	return spec.type === "number" ? value > 0 : Boolean(value);
};

export const quota = (account, key) => {
	const spec = CAPABILITIES[key];
	if (!spec || spec.type !== "number") return 0;
	const value = account?.capabilities?.[key];
	return value ?? spec.default;
};

/**
 * Platform operator: manages every realm, and is the ONLY role exempt from the
 * panel.* gates. Mirrors isSuperadmin in api/libs/scope.js.
 */
export const isSuperadmin = (account) =>
	account?.type === "account.admin" && account?.superadmin === true;

/**
 * Whether this person may see a panel area. Superadmins always can; everyone
 * else - including realm owners - is subject to their resolved capabilities.
 *
 * Use for page/section gating: `canSee(account, "invoices")`.
 */
export const canSee = (account, area) => {
	if (isSuperadmin(account)) return true;
	return can(account, `panel.${area}`);
};

/**
 * Whether money may be shown. Revenue is masked rather than pages hidden, so
 * an ops person can work an event without seeing its takings.
 */
export const canSeeMoney = (account) => canSee(account, "money");

export const familyEnabled = (account, family) => {
	if (AI_HIDDEN && family === "ai") return false;
	for (const key of Object.keys(CAPABILITIES)) {
		if (familyOf(key) === family && can(account, key)) return true;
	}
	const spec = CAPABILITIES[family];
	if (spec) return can(account, family);
	return false;
};

export { offValueFor };
