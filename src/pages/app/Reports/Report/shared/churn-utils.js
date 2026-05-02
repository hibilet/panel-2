import dayjs from "dayjs";

/**
 * Mongo extended-JSON dates can land as one of:
 *   { $date: { $numberLong: 'ms' } }, { $date: 'iso' }, ISO string, Date, number.
 * normalizeDate flattens any of those to a dayjs instance (or null).
 */
export const normalizeDate = (raw) => {
	if (raw == null) return null;
	let value = raw;
	if (typeof raw === "object" && !(raw instanceof Date)) {
		value = raw.$date?.$numberLong ?? raw.$date ?? null;
	}
	if (value == null) return null;
	const d = dayjs(
		typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
	);
	return d.isValid() ? d : null;
};

export const formatStamp = (raw) => {
	const d = normalizeDate(raw);
	return d ? d.format("D MMM YYYY, HH:mm") : null;
};

export const formatDuration = (seconds) => {
	if (seconds == null || Number.isNaN(Number(seconds))) return "-";
	const s = Number(seconds);
	if (s < 60) return `${Math.round(s)}s`;
	const m = Math.floor(s / 60);
	if (m < 60) {
		const sec = Math.round(s % 60);
		return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
	}
	const h = Math.floor(m / 60);
	if (h < 24) {
		const remM = m % 60;
		return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
	}
	const d = Math.floor(h / 24);
	const remH = h % 24;
	return remH > 0 ? `${d}d ${remH}h` : `${d}d`;
};

const itemsSummary = (reservations) => {
	const list = reservations ?? [];
	if (list.length === 0) return null;
	const total = list.reduce((s, r) => s + (Number(r?.price) || 0), 0);
	const groups = new Map();
	for (const r of list) {
		const name = r?.name ?? "—";
		groups.set(name, (groups.get(name) ?? 0) + 1);
	}
	const parts = Array.from(groups.entries()).map(([n, c]) => `${c} × ${n}`);
	return { parts, total };
};

/**
 * Build a chronological journey for one user from their failed and (filtered)
 * successful baskets. Returns an ordered list of events:
 *   { type: 'failed'|'succeeded', at: dayjs, sessionTimeSeconds,
 *     reservations, basketTotal, hasReturned, returnedAt, returnedTotal,
 *     timeToReturnSeconds, isUpsellCandidate, items: { parts, total } }
 *
 * Successful baskets are filtered to those that match the same sale name
 * the failed baskets reference, so the timeline stays focused on this event.
 */
export const buildJourney = (failedBaskets, successfulBaskets) => {
	const failedList = (failedBaskets ?? []).map((fb) => ({
		type: "failed",
		at: normalizeDate(fb.createdAt),
		updatedAt: normalizeDate(fb.updatedAt),
		sessionTimeSeconds: Number(fb.sessionTimeSeconds) || 0,
		reservations: fb.reservations ?? [],
		basketTotal: Number(fb.basketTotal) || 0,
		hasReturned: !!fb.hasReturned,
		returnedAt: normalizeDate(fb.returnedAt),
		returnedTotal: Number(fb.returnedTotal) || 0,
		timeToReturnSeconds: Number(fb.timeToReturnSeconds) || null,
		isUpsellCandidate: !!fb.isUpsellCandidate,
		sale: fb.sale ?? null,
		items: itemsSummary(fb.reservations),
	}));

	// Only show successful baskets for the same sales as the failed ones (or
	// drop the filter entirely if no failed list exists - shouldn't happen
	// since this user wouldn't appear in the report otherwise).
	const failedSaleNames = new Set(
		failedList.map((f) => f.sale).filter(Boolean),
	);
	const successList = (successfulBaskets ?? [])
		.filter((sb) => {
			const name = sb.sale_name ?? sb.sale;
			return failedSaleNames.size === 0 || failedSaleNames.has(name);
		})
		.map((sb) => ({
			type: "succeeded",
			at: normalizeDate(sb.createdAt) ?? normalizeDate(sb.updatedAt),
			reservations: sb.reservations ?? [],
			basketTotal: Number(sb.basketTotal) || 0,
			sale: sb.sale_name ?? sb.sale ?? null,
			items: itemsSummary(sb.reservations),
		}));

	return [...failedList, ...successList]
		.filter((e) => e.at != null)
		.sort((a, b) => a.at.valueOf() - b.at.valueOf());
};

/**
 * Distribution of failed baskets by hour-of-day (0-23) and weekday (0-6,
 * Mon=0). Used to surface "most abandoned hour / weekday" insight. The
 * caller supplies a flat array of failedBaskets (one per attempt across
 * all users in the report).
 */
export const abandonmentDistribution = (allFailedBaskets) => {
	const byHour = new Array(24).fill(0);
	const byWeekday = new Array(7).fill(0);
	let peakHour = null;
	let peakWeekday = null;
	for (const fb of allFailedBaskets ?? []) {
		const at = normalizeDate(fb.createdAt);
		if (!at) continue;
		const hour = at.hour();
		const dow = at.day(); // 0=Sun ... 6=Sat
		const wkIdx = dow === 0 ? 6 : dow - 1; // 0=Mon ... 6=Sun
		byHour[hour] += 1;
		byWeekday[wkIdx] += 1;
	}
	for (let i = 0; i < 24; i += 1) {
		if (byHour[i] > 0 && (peakHour == null || byHour[i] > byHour[peakHour]))
			peakHour = i;
	}
	for (let i = 0; i < 7; i += 1) {
		if (
			byWeekday[i] > 0 &&
			(peakWeekday == null || byWeekday[i] > byWeekday[peakWeekday])
		)
			peakWeekday = i;
	}
	return { byHour, byWeekday, peakHour, peakWeekday };
};

/**
 * Build a daily timeline aligning sales count, churn count, and net for
 * the comparison chart. `salesByDay` and `churnByDay` come in as
 * Map<YYYY-MM-DD, count>.
 */
export const buildSalesVsChurn = (salesByDay, churnByDay, start, end) => {
	const days = [];
	let cur = dayjs(start).startOf("day");
	const last = dayjs(end).startOf("day");
	if (!cur.isValid() || !last.isValid()) return days;
	while (cur.isBefore(last) || cur.isSame(last, "day")) {
		const key = cur.format("YYYY-MM-DD");
		const sales = salesByDay.get(key) ?? 0;
		const churn = churnByDay.get(key) ?? 0;
		days.push({
			label: cur.format("D MMM"),
			key,
			sales,
			churn,
			// Plot churn as negative so the area sits below the zero line,
			// making it visually distinct from sales without needing a
			// separate Y axis.
			churnNegative: -churn,
			net: sales - churn,
		});
		cur = cur.add(1, "day");
	}
	return days;
};

const csvEscape = (v) => {
	if (v == null) return "";
	const s = String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const flattenEntries = (entries) =>
	(entries ?? []).map((e) => ({
		email: e.owner?.email ?? e._id ?? "",
		name: e.owner?.name ?? "",
		segment: e.segment ?? "",
		failedBaskets: Number(e.totalFailedBaskets) || 0,
		failedRevenue: Number(e.totalFailedRevenue) || 0,
		avgSessionSeconds: Number(e.avgFailedSessionTime) || 0,
		successfulBasketsEver: Number(e.totalSuccessfulBasketsEver) || 0,
		totalSpendingsEver: Number(e.totalSpendingsEver) || 0,
		isPaidCustomer: !!e.isPaidCustomer,
		isLoyalMerchantCustomer: !!e.isLoyalMerchantCustomer,
		firstFailedAt: formatStamp(e.failedBaskets?.[0]?.createdAt) ?? "",
		lastFailedAt:
			formatStamp(e.failedBaskets?.[e.failedBaskets?.length - 1]?.createdAt) ??
			"",
	}));

export const toCsv = (rows, headers) => {
	const head = headers.map((h) => csvEscape(h.label)).join(",");
	const body = rows
		.map((r) => headers.map((h) => csvEscape(r[h.key])).join(","))
		.join("\n");
	return `${head}\n${body}\n`;
};

export const downloadCsv = (filename, content) => {
	const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

export const SEGMENT_TYPES = {
	upsell: {
		labelKey: "page.reports.churn.segment.upsell",
		className: "bg-violet-100 text-violet-800",
	},
	high_value: {
		labelKey: "page.reports.churn.segment.high_value",
		className: "bg-amber-100 text-amber-800",
	},
	loyal_merchant_customer: {
		labelKey: "page.reports.churn.segment.loyal_merchant_customer",
		className: "bg-emerald-100 text-emerald-800",
	},
	excellent_lead: {
		labelKey: "page.reports.churn.segment.excellent_lead",
		className: "bg-sky-100 text-sky-800",
	},
	good_lead: {
		labelKey: "page.reports.churn.segment.good_lead",
		className: "bg-teal-100 text-teal-800",
	},
	group_organizer: {
		labelKey: "page.reports.churn.segment.group_organizer",
		className: "bg-indigo-100 text-indigo-800",
	},
	deadline_abandoner: {
		labelKey: "page.reports.churn.segment.deadline_abandoner",
		className: "bg-orange-100 text-orange-800",
	},
	medium_signal_lead: {
		labelKey: "page.reports.churn.segment.medium_signal_lead",
		className: "bg-slate-200 text-slate-700",
	},
	low_signal_lead: {
		labelKey: "page.reports.churn.segment.low_signal_lead",
		className: "bg-slate-100 text-slate-500",
	},
};

export const SEGMENT_ORDER = [
	"upsell",
	"high_value",
	"loyal_merchant_customer",
	"excellent_lead",
	"good_lead",
	"group_organizer",
	"deadline_abandoner",
	"medium_signal_lead",
	"low_signal_lead",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
