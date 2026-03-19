import { useCallback, useMemo, useState } from "react";
import { Link } from "wouter";
import { StatCard } from "../../../../components/shared";
import strings, { formatCurrency } from "../../../../localization";

import churnData from "./dummy.churn.json";

const sumReservations = (items) => {
	if (!Array.isArray(items)) return 0;
	const flat = items.flat?.() ?? items;
	return flat.reduce((s, r) => s + (Number(r?.price) || 0), 0);
};

const getFailedSubtotal = (basket) => sumReservations(basket?.reservations ?? []);
const getSuccessfulSubtotal = (basket) =>
	Number(basket?.basketTotal) || sumReservations(basket?.reservations ?? []);

/** Successful baskets for the same sales the user had failed baskets for */
const getSuccessfulBasketsOnFailedSales = (entry) => {
	const failed = entry.failedBaskets ?? [];
	const successful = entry.allSuccessfulBasketsEver ?? [];
	const failedSaleNames = new Set(failed.map((fb) => fb.sale).filter(Boolean));
	const matching = successful.filter((sb) => failedSaleNames.has(sb.sale_name ?? sb.sale));
	return {
		count: matching.length,
		revenue: matching.reduce((s, sb) => s + getSuccessfulSubtotal(sb), 0),
	};
};

const LEAD_TYPES = {
	converted: { key: "converted", labelKey: "page.reports.churn.lead.converted", className: "bg-emerald-100 text-emerald-800" },
	upsell: { key: "upsell", labelKey: "page.reports.churn.lead.upsell", className: "bg-violet-100 text-violet-800" },
	strongLead: { key: "strongLead", labelKey: "page.reports.churn.lead.strongLead", className: "bg-amber-100 text-amber-800" },
	goodLead: { key: "goodLead", labelKey: "page.reports.churn.lead.goodLead", className: "bg-sky-100 text-sky-800" },
	weakLead: { key: "weakLead", labelKey: "page.reports.churn.lead.weakLead", className: "bg-slate-100 text-slate-600" },
};

const LEAD_ORDER = ["upsell", "converted", "strongLead", "goodLead", "weakLead"];

const classifyLead = (entry) => {
	const failed = entry.failedBaskets ?? [];
	const successful = entry.allSuccessfulBasketsEver ?? [];
	const isPaid = entry.isPaidCustomer === "true";
	const failedCount = failed.length;

	if (failedCount === 0) return null;

	const failedSaleNames = new Set(failed.map((fb) => fb.sale).filter(Boolean));
	const successfulSaleNames = new Set(successful.map((sb) => sb.sale_name ?? sb.sale).filter(Boolean));
	const successfulForOtherSales = [...successfulSaleNames].some((s) => !failedSaleNames.has(s));

	// Upsell first: failed revenue > total spendings on same sale, and spendings > 0
	const failedRevenueBySale = {};
	for (const fb of failed) {
		const saleName = fb.sale;
		if (!saleName) continue;
		failedRevenueBySale[saleName] = (failedRevenueBySale[saleName] || 0) + getFailedSubtotal(fb);
	}
	const spendingsBySale = {};
	for (const sb of successful) {
		const saleName = sb.sale_name ?? sb.sale;
		if (!saleName) continue;
		spendingsBySale[saleName] = (spendingsBySale[saleName] || 0) + getSuccessfulSubtotal(sb);
	}
	for (const saleName of Object.keys(failedRevenueBySale)) {
		const failedRev = failedRevenueBySale[saleName] || 0;
		const spendings = spendingsBySale[saleName] || 0;
		if (spendings > 0 && failedRev > spendings) return LEAD_TYPES.upsell;
	}

	const hasReturnedAndBought = failed.some((fb) => fb.hasReturned === true) && successful.length > 0;
	if (hasReturnedAndBought) return LEAD_TYPES.converted;

	if (failedCount > 1 && successfulForOtherSales) return LEAD_TYPES.strongLead;

	if (isPaid && failedCount > 0) return LEAD_TYPES.goodLead;
	if (!isPaid && failedCount > 0) return LEAD_TYPES.weakLead;

	return null;
};

const formatDuration = (seconds) => {
	if (seconds == null || Number.isNaN(Number(seconds))) return "—";
	const s = Number(seconds);
	if (s < 60) return `${Math.round(s)}s`;
	const m = Math.floor(s / 60);
	const sec = Math.round(s % 60);
	return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
};

const ChurnUserCard = ({ entry }) => {
	const owner = entry.owner ?? {};
	const name = owner.name?.trim() ?? entry._id ?? "—";
	const email = owner.email ?? entry._id ?? "—";
	const isPaid = entry.isPaidCustomer === "true";
	const failed = entry.failedBaskets ?? [];
	const failedBaskets = failed.length;
	const failedRevenue = failed.reduce((s, fb) => s + getFailedSubtotal(fb), 0);
	const successfulOnFailedSales = getSuccessfulBasketsOnFailedSales(entry);
	const totalSpendingsEver = Number(entry.totalSpendingsEver) || 0;
	const totalBasketsEver = Number(entry.totalSuccessfulBasketsEver) || 0;
	const churnedSales = Number(entry.churnedSalesCount) || 0;
	const avgSessionSec = Number(entry.avgFailedSessionTime) || 0;
	const leadBadge = classifyLead(entry);

	const failedEvents = [...new Set((entry.failedBaskets ?? []).map((fb) => fb.sale).filter(Boolean))];
	const successfulEvents = [...new Set((entry.allSuccessfulBasketsEver ?? []).map((sb) => sb.sale_name ?? sb.sale).filter(Boolean))];

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-slate-900">{name}</p>
					<p className="truncate text-sm text-slate-500">{email}</p>
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
					{leadBadge && (
						<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${leadBadge.className}`}>
							{strings(leadBadge.labelKey)}
						</span>
					)}
					<span
						className={`rounded-full px-2 py-0.5 text-xs font-medium ${
							isPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
						}`}
					>
						{isPaid ? strings("page.reports.churn.paidCustomer") : strings("page.reports.churn.notPaid")}
					</span>
				</div>
			</div>
			<dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.failedBaskets")}: </dt>
					<dd className="inline font-medium text-slate-900">{failedBaskets}</dd>
				</div>
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.failedRevenue")}: </dt>
					<dd className="inline font-medium text-slate-900">{formatCurrency(failedRevenue)}</dd>
				</div>
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.successfulBaskets")}: </dt>
					<dd className="inline font-medium text-slate-900">{successfulOnFailedSales.count}</dd>
				</div>
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.successfulBasketRevenue")}: </dt>
					<dd className="inline font-medium text-slate-900">{formatCurrency(successfulOnFailedSales.revenue)}</dd>
				</div>
				{/* <div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.totalSpendingsEver")}: </dt>
					<dd className="inline font-medium text-slate-900">{formatCurrency(totalSpendingsEver)}</dd>
				</div> */}
				{/* <div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.totalBasketsEver")}: </dt>
					<dd className="inline font-medium text-slate-900">{totalBasketsEver}</dd>
				</div> */}
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.churnedSales")}: </dt>
					<dd className="inline font-medium text-slate-900">{churnedSales}</dd>
				</div>
				<div>
					<dt className="inline text-slate-500">{strings("page.reports.churn.avgSessionDuration")}: </dt>
					<dd className="inline font-medium text-slate-900">{formatDuration(avgSessionSec)}</dd>
				</div>
			</dl>
			{(failedEvents.length > 0 || successfulEvents.length > 0) && (
				<div className="mt-3 space-y-1.5">
					{failedEvents.length > 0 && (
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-xs text-slate-500">{strings("page.reports.churn.failedEvents")}:</span>
							{failedEvents.map((ev) => (
								<span key={ev} className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">
									{ev}
								</span>
							))}
						</div>
					)}
					{successfulEvents.length > 0 && (
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-xs text-slate-500">{strings("page.reports.churn.successfulEvents")}:</span>
							{successfulEvents.map((ev) => (
								<span key={ev} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
									{ev}
								</span>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const ChurnReport = () => {
	const [selectedFilter, setSelectedFilter] = useState(null);

	const selectFilter = useCallback((key) => {
		setSelectedFilter((prev) => (prev === key ? null : key));
	}, []);

	const filteredEntries = useMemo(() => {
		const list = Array.isArray(churnData) ? churnData : [];
		if (!selectedFilter) return list;
		return list.filter((entry) => {
			const badge = classifyLead(entry);
			return badge?.key === selectedFilter;
		});
	}, [selectedFilter]);

	const stats = useMemo(() => {
		const list = filteredEntries;
		const failedRevenue = list.reduce(
			(s, e) => s + (e.failedBaskets ?? []).reduce((a, fb) => a + getFailedSubtotal(fb), 0),
			0,
		);
		const successfulBasketRevenue = list.reduce(
			(s, e) => s + getSuccessfulBasketsOnFailedSales(e).revenue,
			0,
		);
		const totalSpendingsEver = list.reduce((s, e) => s + (Number(e.totalSpendingsEver) || 0), 0);
		const totalBasketsEver = list.reduce((s, e) => s + (Number(e.totalSuccessfulBasketsEver) || 0), 0);
		const sessionTimes = list
			.map((e) => Number(e.avgFailedSessionTime))
			.filter((v) => !Number.isNaN(v) && v > 0);
		const avgSession = sessionTimes.length > 0
			? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
			: null;
		return {
			users: list.length,
			failedRevenue,
			successfulBasketRevenue,
			totalSpendingsEver,
			totalBasketsEver,
			avgSession,
		};
	}, [filteredEntries]);

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/reports"
				className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.reports")}
			</Link>

			<div>
				<h2 className="mb-4 text-lg font-semibold text-slate-900">
					{strings("page.reports.weeklyChurn")}
				</h2>
				<div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						label={strings("page.reports.churn.stats.users")}
						value={stats.users}
					/>
					<StatCard
						label={strings("page.reports.churn.stats.successfulBasketRevenue")}
						value={formatCurrency(stats.successfulBasketRevenue)}
					/>
					<StatCard
						label={strings("page.reports.churn.stats.failedRevenue")}
						value={formatCurrency(stats.failedRevenue - stats.successfulBasketRevenue)}
					/>
				
					{/* <StatCard
						label={strings("page.reports.churn.stats.totalSpendingsEver")}
						value={formatCurrency(stats.totalSpendingsEver)}
					/> */}
					{/* <StatCard
						label={strings("page.reports.churn.stats.totalBasketsEver")}
						value={stats.totalBasketsEver}
					/> */}
					<StatCard
						label={strings("page.reports.churn.stats.avgSession")}
						value={formatDuration(stats.avgSession)}
					/>
				</div>
				<div className="mb-4 flex flex-wrap gap-2">
					{LEAD_ORDER.map((key) => {
						const type = LEAD_TYPES[key];
						const isSelected = selectedFilter === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => selectFilter(key)}
								className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
									isSelected ? `${type.className} ring-2 ring-offset-1 ring-slate-400` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								{strings(type.labelKey)}
							</button>
						);
					})}
					{selectedFilter && (
						<button
							type="button"
							onClick={() => setSelectedFilter(null)}
							className="rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
						>
							{strings("page.reports.churn.clearFilters")}
						</button>
					)}
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
					{filteredEntries.map((entry) => (
						<ChurnUserCard key={entry._id} entry={entry} />
					))}
				</div>
			</div>
		</div>
	);
};

export default ChurnReport;
