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

	channels: { type: "number", default: 0, label: "Channels" },
	sales: { type: "number", default: 0, label: "Sales" },
	reservations: { type: "number", default: 0, label: "Reservations" },
	links: { type: "number", default: 0, label: "Links" },
	giveaways: { type: "bool", default: false, label: "Giveaways" },
};

export const FAMILIES = [
	"ai",
	"reporting",
	"channels",
	"sales",
	"reservations",
	"links",
	"giveaways",
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

export const familyEnabled = (account, family) => {
	for (const key of Object.keys(CAPABILITIES)) {
		if (familyOf(key) === family && can(account, key)) return true;
	}
	const spec = CAPABILITIES[family];
	if (spec) return can(account, family);
	return false;
};

export { offValueFor };
