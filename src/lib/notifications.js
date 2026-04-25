import strings from "../localization";

const SALE_LINK_RE = /\/sales\/([^/?#]+)/;

export const getNotificationTypeLabel = (type) => {
	if (!type) return "—";
	const key = `notification.type.${type}`;
	const translated = strings(key);
	return translated === key ? type : translated;
};

export const getNotificationSeverityLabel = (severity) => {
	if (!severity) return strings("notification.severity.info");
	const key = `notification.severity.${severity}`;
	const translated = strings(key);
	return translated === key ? severity : translated;
};

const extractSaleId = (n) => {
	if (!n) return null;
	if (n.data?.sale) return n.data.sale;
	if (n.sale) return n.sale;
	if (n.params?.sale) return n.params.sale;
	if (typeof n.link === "string") {
		const m = n.link.match(SALE_LINK_RE);
		if (m) return m[1];
	}
	return null;
};

const stripDashboardPrefix = (link) => {
	if (typeof link !== "string") return link;
	if (link.startsWith("http")) return link;
	return link.replace(/^\/dashboard(?=\/|$)/, "") || "/";
};

export const resolveNotificationLink = (n) => {
	if (!n) return null;
	if (n.type === "sale.first" || n.type === "sale.firstEvent") {
		const id = extractSaleId(n);
		if (id) return `/sales/${id}/attendees`;
	}
	return n.link ? stripDashboardPrefix(n.link) : null;
};
