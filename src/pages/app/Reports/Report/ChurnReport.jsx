import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import Input from "../../../../components/inputs/Input";
import Select from "../../../../components/inputs/Select";
import { StatCard } from "../../../../components/shared";
import { useApp } from "../../../../context";
import { get } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

const SEGMENT_TYPES = {
	upsell: { labelKey: "page.reports.churn.segment.upsell", className: "bg-violet-100 text-violet-800" },
	high_value: { labelKey: "page.reports.churn.segment.high_value", className: "bg-amber-100 text-amber-800" },
	loyal_merchant_customer: { labelKey: "page.reports.churn.segment.loyal_merchant_customer", className: "bg-emerald-100 text-emerald-800" },
	excellent_lead: { labelKey: "page.reports.churn.segment.excellent_lead", className: "bg-sky-100 text-sky-800" },
	good_lead: { labelKey: "page.reports.churn.segment.good_lead", className: "bg-teal-100 text-teal-800" },
	group_organizer: { labelKey: "page.reports.churn.segment.group_organizer", className: "bg-indigo-100 text-indigo-800" },
	deadline_abandoner: { labelKey: "page.reports.churn.segment.deadline_abandoner", className: "bg-orange-100 text-orange-800" },
	medium_signal_lead: { labelKey: "page.reports.churn.segment.medium_signal_lead", className: "bg-slate-200 text-slate-700" },
	low_signal_lead: { labelKey: "page.reports.churn.segment.low_signal_lead", className: "bg-slate-100 text-slate-500" },
};

const SEGMENT_ORDER = [
	"upsell", "high_value", "loyal_merchant_customer", "excellent_lead",
	"good_lead", "group_organizer", "deadline_abandoner", "medium_signal_lead", "low_signal_lead",
];

const formatDuration = (seconds) => {
	if (seconds == null || Number.isNaN(Number(seconds))) return "-";
	const s = Number(seconds);
	if (s < 60) return `${Math.round(s)}s`;
	const m = Math.floor(s / 60);
	const sec = Math.round(s % 60);
	return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
};

const ChurnUserCard = ({ entry }) => {
	const owner = entry.owner ?? {};
	const name = owner.name?.trim() ?? entry._id ?? "-";
	const email = owner.email ?? entry._id ?? "-";
	const isPaid = !!entry.isPaidCustomer;
	const failedBaskets = Number(entry.totalFailedBaskets) || 0;
	const failedRevenue = Number(entry.totalFailedRevenue) || 0;
	const avgSessionSec = Number(entry.avgFailedSessionTime) || 0;
	const segmentInfo = SEGMENT_TYPES[entry.segment] ?? null;

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
					{segmentInfo && (
						<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${segmentInfo.className}`}>
							{strings(segmentInfo.labelKey)}
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
	const { sales: currentSales } = useApp();
	const [pastSales, setPastSales] = useState([]);
	const [salesLoading, setSalesLoading] = useState(true);

	const [selectedSaleId, setSelectedSaleId] = useState("");
	const [startDate, setStartDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return d.toISOString().slice(0, 10);
	});
	const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

	const [reportData, setReportData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [selectedFilter, setSelectedFilter] = useState(null);

	useEffect(() => {
		setSalesLoading(true);
		get("/sales?past=true&revenue=true")
			.then((res) => setPastSales(res.data ?? []))
			.catch(() => {})
			.finally(() => setSalesLoading(false));
	}, []);

	const allSalesOptions = useMemo(() => {
		const seen = new Set();
		return [...(currentSales ?? []), ...pastSales]
			.filter((s) => {
				const id = s.id ?? s._id;
				if (!id || seen.has(id)) return false;
				seen.add(id);
				return true;
			})
			.map((s) => ({ value: s.id ?? s._id, label: s.name }));
	}, [currentSales, pastSales]);

	const handleGenerate = useCallback(async () => {
		if (!selectedSaleId) return;
		setLoading(true);
		setError(null);
		setReportData(null);
		setSelectedFilter(null);
		try {
			const params = new URLSearchParams({ sale: selectedSaleId, start: startDate, end: endDate });
			const res = await get(`/sales/reports/churn?${params}`);
			setReportData(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoad"));
		} finally {
			setLoading(false);
		}
	}, [selectedSaleId, startDate, endDate]);

	const filteredEntries = useMemo(() => {
		const list = Array.isArray(reportData) ? reportData : [];
		if (!selectedFilter) return list;
		return list.filter((e) => e.segment === selectedFilter);
	}, [reportData, selectedFilter]);

	const stats = useMemo(() => {
		const list = filteredEntries;
		const totalFailedRevenue = list.reduce((s, e) => s + (Number(e.totalFailedRevenue) || 0), 0);
		const totalFailedBaskets = list.reduce((s, e) => s + (Number(e.totalFailedBaskets) || 0), 0);
		const times = list.map((e) => Number(e.avgFailedSessionTime)).filter((v) => !Number.isNaN(v) && v > 0);
		const avgSession = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
		return { users: list.length, totalFailedRevenue, totalFailedBaskets, avgSession };
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

			<h2 className="text-lg font-semibold text-slate-900">
				{strings("page.reports.weeklyChurn")}
			</h2>

			<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
					<Select
						label={strings("page.reports.churn.selectSale")}
						name="sale"
						value={selectedSaleId}
						onChange={(e) => setSelectedSaleId(e.target.value)}
						options={allSalesOptions}
						placeholder={salesLoading ? "..." : strings("page.reports.churn.selectSale")}
						disabled={loading}
					/>
					<Input
						label={strings("page.reports.churn.startDate")}
						type="date"
						name="start"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						disabled={loading}
					/>
					<Input
						label={strings("page.reports.churn.endDate")}
						type="date"
						name="end"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						disabled={loading}
					/>
					<div className="flex items-end">
						<button
							type="button"
							disabled={!selectedSaleId || loading}
							onClick={handleGenerate}
							className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
						>
							{loading && <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />}
							{loading ? strings("page.reports.churn.generating") : strings("page.reports.churn.generateReport")}
						</button>
					</div>
				</div>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error}
				</div>
			)}

			{reportData === null && !error && !loading && (
				<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
					<i className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300" aria-hidden />
					<p>{strings("page.reports.churn.empty.selectSale")}</p>
				</div>
			)}

			{loading && (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
						))}
					</div>
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
					))}
				</div>
			)}

			{reportData !== null && !loading && reportData.length === 0 && (
				<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
					<i className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300" aria-hidden />
					<p>{strings("page.reports.churn.empty.noData")}</p>
				</div>
			)}

			{reportData !== null && !loading && reportData.length > 0 && (
				<>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						<StatCard label={strings("page.reports.churn.stats.users")} value={stats.users} />
						<StatCard label={strings("page.reports.churn.stats.failedRevenue")} value={formatCurrency(stats.totalFailedRevenue)} />
						<StatCard label={strings("page.reports.churn.stats.totalFailedBaskets")} value={stats.totalFailedBaskets} />
						<StatCard label={strings("page.reports.churn.stats.avgSession")} value={formatDuration(stats.avgSession)} />
					</div>

					<div className="flex flex-wrap gap-2">
						{SEGMENT_ORDER.map((key) => {
							const type = SEGMENT_TYPES[key];
							const isSelected = selectedFilter === key;
							return (
								<button
									key={key}
									type="button"
									onClick={() => setSelectedFilter((prev) => (prev === key ? null : key))}
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

					<div className="grid gap-3 lg:grid-cols-1">
						{filteredEntries.map((entry) => (
							<ChurnUserCard key={entry._id} entry={entry} />
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default ChurnReport;
