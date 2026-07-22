import strings from "../localization";

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

// The API stores extra ids under `meta`; older payloads used `data`/`params`.
const metaOf = (n) => n?.meta ?? n?.data ?? n?.params ?? {};

const idOf = (v) => {
	if (!v) return null;
	if (typeof v === "string") return v;
	if (typeof v === "object") return v.id ?? v._id ?? null;
	return String(v);
};

// The API prefixes some links with /dashboard (the panel is mounted at root).
const stripDashboardPrefix = (link) => {
	if (typeof link !== "string") return link;
	if (link.startsWith("http")) return link;
	return link.replace(/^\/dashboard(?=\/|$)/, "") || "/";
};

// Derived from the notification type + meta. Used when the API sent no link
// (sweep/rollup notifications) and to give sale notifications a deeper target.
const linkFromType = (n) => {
	const type = n?.type ?? "";
	const meta = metaOf(n);
	const reportId = idOf(meta.reportId ?? meta.report ?? n.report);
	const invoiceId = idOf(meta.invoiceId ?? meta.invoice ?? n.invoice);
	const jobId = idOf(meta.jobId ?? meta.job ?? n.job);
	const saleId = idOf(meta.saleId ?? meta.sale ?? n.sale);

	if (type === "sale.first" || type === "sale.firstEvent") {
		return saleId ? `/sales/${saleId}/attendees` : "/sales";
	}
	if (type.startsWith("report.")) {
		return reportId ? `/reports/${reportId}` : "/reports";
	}
	if (type.startsWith("invoice.")) {
		return invoiceId ? `/invoices/${invoiceId}` : "/invoices";
	}
	if (type === "job.invoice.errors") return "/invoices";
	if (type.startsWith("job.")) {
		return jobId ? `/jobs/${jobId}` : "/jobs";
	}
	if (type.startsWith("mail.")) return "/settings/mailing";
	if (saleId) return `/sales/${saleId}`;
	return null;
};

export const resolveNotificationLink = (n) => {
	if (!n) return null;
	const derived = linkFromType(n);
	// A derived deep link beats the stored one only when the stored link is
	// missing or is a bare list route the derived link refines.
	if (derived?.includes("/", 1)) return derived;
	return n.link ? stripDashboardPrefix(n.link) : derived;
};
