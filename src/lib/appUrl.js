/**
 * Derives app host from current hostname (e.g. panel.hibilet.com → app.hibilet.com).
 */
export const getAppBase = () => {
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

export const getChannelLink = (channelId) => {
	if (!channelId) return null;
	const base = getAppBase().replace(/\/$/, "");
	return base ? `${base}/${channelId}` : null;
};

export const getLinkUrl = (slug) => {
	if (!slug) return null;
	const base = getAppBase().replace(/\/$/, "");
	return base ? `${base}/${slug}` : null;
};
