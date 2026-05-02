/**
 * Resolution priority for the buyer-facing widget URL:
 *   1. realm.domains[service=widget|tickets].hostname  (with https://)
 *   2. realm.urls.widget
 *   3. realm.urls.tickets
 *   4. VITE_WIDGET_APP_URL build-time env var (legacy default)
 *   5. derive from current hostname (panel.* -> app.*)
 *
 * Pass realm from useApp() to make a link resolve on the merchant's
 * actual whitelabel host. Without it, channel/link URLs default to the
 * hibilet build-time env which is wrong for any realm with its own
 * domain.
 */
const fromDomains = (realm, ...services) => {
	const list = realm?.domains;
	if (!Array.isArray(list) || !list.length) return null;
	for (const service of services) {
		const match = list.find((d) => d?.service === service && d?.hostname);
		if (match) return `https://${match.hostname}`;
	}
	return null;
};

const deriveFromHostname = () => {
	if (typeof window === "undefined") return "";
	const hostname = window.location.hostname;
	const parts = hostname.split(".");
	let appHost;
	if (parts.length >= 3) {
		parts[0] = "app";
		appHost = parts.join(".");
	} else {
		appHost = `app.${hostname}`;
	}
	const protocol = window.location.protocol || "https:";
	return `${protocol}//${appHost}`;
};

export const getWidgetBase = (realm) =>
	fromDomains(realm, "widget", "tickets")
	|| realm?.urls?.widget
	|| realm?.urls?.tickets
	|| import.meta.env.VITE_WIDGET_APP_URL
	|| deriveFromHostname();

// Kept for backwards-compat with code paths that still derive from
// hostname; prefer getWidgetBase(realm).
export const getAppBase = deriveFromHostname;

export const getChannelLink = (channelId, realm) => {
	if (!channelId) return null;
	const base = getWidgetBase(realm)?.replace(/\/$/, "");
	return base ? `${base}/${channelId}` : null;
};

export const getLinkUrl = (slug, realm) => {
	if (!slug) return null;
	const base = getWidgetBase(realm)?.replace(/\/$/, "");
	return base ? `${base}/${slug}` : null;
};

export const getWidgetLinkUrl = (slug, realm) => {
	if (!slug) return null;
	const base = getWidgetBase(realm)?.replace(/\/$/, "");
	return base ? `${base}/${slug}` : null;
};

export const getWidgetChannelLink = (channelId, realm) => {
	if (!channelId) return null;
	const base = getWidgetBase(realm)?.replace(/\/$/, "");
	return base ? `${base}/${channelId}` : null;
};
