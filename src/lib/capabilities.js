// Mirror of api/libs/capabilities.js. Keep in sync.
// 9999 = unlimited (UI shows "Unlimited" label).

export const UNLIMITED = 9999;

export const CAPABILITIES = {
	"ai.tips": { type: "bool", default: false, label: "AI tips" },
	"ai.image.enhance": {
		type: "bool",
		default: false,
		label: "AI image enhance",
	},
	"ai.report.summary": {
		type: "bool",
		default: false,
		label: "AI report summary",
	},

	"reporting.sales": {
		type: "bool",
		default: false,
		label: "Sales reporting",
	},
	"reporting.churn": {
		type: "bool",
		default: false,
		label: "Churn reporting",
	},

	"branding.disable": {
		type: "bool",
		default: false,
		label: "Hide platform branding",
	},

	channels: { type: "number", default: 0, label: "Channels" },
	sales: { type: "number", default: 0, label: "Sales" },
	reservations: { type: "number", default: 0, label: "Reservations" },
	links: { type: "number", default: 0, label: "Links" },
	giveaways: { type: "bool", default: false, label: "Giveaways" },

	// panel.*: what a person may SEE, rather than what their plan includes.
	// Driven by realm staff roles and per-account overrides, never by tiers.
	// All default true, so nobody loses access until a key is turned off.
	"panel.dashboard": { type: "bool", default: true, label: "Dashboard" },
	"panel.money": { type: "bool", default: true, label: "Revenue figures" },
	"panel.sales": { type: "bool", default: true, label: "Sales" },
	"panel.transactions": {
		type: "bool",
		default: true,
		label: "Transactions",
	},
	"panel.invoices": { type: "bool", default: true, label: "Invoices" },
	"panel.reports": { type: "bool", default: true, label: "Reports" },
	"panel.accounts": { type: "bool", default: true, label: "Accounts" },
	"panel.settings": { type: "bool", default: true, label: "Settings" },
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
	for (const key of Object.keys(CAPABILITIES)) {
		if (familyOf(key) === family && can(account, key)) return true;
	}
	const spec = CAPABILITIES[family];
	if (spec) return can(account, family);
	return false;
};

export { offValueFor };
