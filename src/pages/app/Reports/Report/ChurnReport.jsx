import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import Input from "../../../../components/inputs/Input";
import Select from "../../../../components/inputs/Select";
import { StatCard } from "../../../../components/shared";
import { useApp } from "../../../../context";
import { get } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";
import AbandonmentInsights from "./shared/AbandonmentInsights";
import ChurnTable from "./shared/ChurnTable";
import {
	formatDuration,
	SEGMENT_ORDER,
	SEGMENT_TYPES,
} from "./shared/churn-utils.js";
import JourneyTimeline from "./shared/JourneyTimeline";
import SalesVsChurnChart, {
	collectSalesByDay,
} from "./shared/SalesVsChurnChart";

const ChurnUserCard = ({ entry }) => {
	const owner = entry.owner ?? {};
	const name = owner.name?.trim() ?? entry._id ?? "-";
	const email = owner.email ?? entry._id ?? "-";
	const isPaid = !!entry.isPaidCustomer;
	const failedBaskets = Number(entry.totalFailedBaskets) || 0;
	const failedRevenue = Number(entry.totalFailedRevenue) || 0;
	const avgSessionSec = Number(entry.avgFailedSessionTime) || 0;
	const segmentInfo = SEGMENT_TYPES[entry.segment] ?? null;
	const [open, setOpen] = useState(false);

	return (
		<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-start justify-between gap-3 p-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-slate-900">{name}</p>
					<p className="truncate text-sm text-slate-500">{email}</p>
					<dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<div>
							<dt className="inline text-slate-500">
								{strings("page.reports.churn.failedBaskets")}:{" "}
							</dt>
							<dd className="inline font-medium text-slate-900">
								{failedBaskets}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">
								{strings("page.reports.churn.failedRevenue")}:{" "}
							</dt>
							<dd className="inline font-medium text-slate-900">
								{formatCurrency(failedRevenue)}
							</dd>
						</div>
						<div>
							<dt className="inline text-slate-500">
								{strings("page.reports.churn.avgSessionDuration")}:{" "}
							</dt>
							<dd className="inline font-medium text-slate-900">
								{formatDuration(avgSessionSec)}
							</dd>
						</div>
					</dl>
				</div>
				<div className="flex shrink-0 flex-wrap items-start gap-1.5">
					{segmentInfo && (
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${segmentInfo.className}`}
						>
							{strings(segmentInfo.labelKey)}
						</span>
					)}
					<span
						className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
					>
						{isPaid
							? strings("page.reports.churn.paidCustomer")
							: strings("page.reports.churn.notPaid")}
					</span>
					<i
						className={`fa-solid fa-chevron-${open ? "up" : "down"} mt-0.5 text-xs text-slate-400`}
						aria-hidden
					/>
				</div>
			</button>
			{open && (
				<div className="border-t border-slate-100 px-4 pb-4 pt-3">
					<p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
						{strings("page.reports.churn.journey.title")}
					</p>
					<JourneyTimeline
						failedBaskets={entry.failedBaskets ?? []}
						successfulBaskets={entry.allSuccessfulBasketsEver ?? []}
					/>
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
	const [endDate, setEndDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);

	const [reportData, setReportData] = useState(null);
	const [salesData, setSalesData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [selectedFilter, setSelectedFilter] = useState(null);
	const [tab, setTab] = useState("cards");

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
		setSalesData(null);
		setSelectedFilter(null);
		try {
			const churnParams = new URLSearchParams({
				sale: selectedSaleId,
				start: startDate,
				end: endDate,
			});
			// 'monthly' bucket gives day-level rows (`%Y-%m-%d`) which is what
			// the comparison chart needs to align day-by-day with churn.
			const salesParams = new URLSearchParams({
				sale: selectedSaleId,
				start: startDate,
				end: endDate,
				period: "monthly",
			});
			const [churnRes, salesRes] = await Promise.all([
				get(`/sales/reports/churn?${churnParams}`),
				get(`/sales/reports/sales?${salesParams}`).catch(() => ({ data: [] })),
			]);
			setReportData(Array.isArray(churnRes.data) ? churnRes.data : []);
			setSalesData(Array.isArray(salesRes.data) ? salesRes.data : []);
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
		const totalFailedRevenue = list.reduce(
			(s, e) => s + (Number(e.totalFailedRevenue) || 0),
			0,
		);
		const totalFailedBaskets = list.reduce(
			(s, e) => s + (Number(e.totalFailedBaskets) || 0),
			0,
		);
		const times = list
			.map((e) => Number(e.avgFailedSessionTime))
			.filter((v) => !Number.isNaN(v) && v > 0);
		const avgSession = times.length
			? times.reduce((a, b) => a + b, 0) / times.length
			: null;
		return {
			users: list.length,
			totalFailedRevenue,
			totalFailedBaskets,
			avgSession,
		};
	}, [filteredEntries]);

	const salesByDay = useMemo(
		() => collectSalesByDay(salesData ?? []),
		[salesData],
	);

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
						placeholder={
							salesLoading ? "..." : strings("page.reports.churn.selectSale")
						}
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
							className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading && (
								<i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
							)}
							{loading
								? strings("page.reports.churn.generating")
								: strings("page.reports.churn.generateReport")}
						</button>
					</div>
				</div>
			</div>

			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			{reportData === null && !error && !loading && (
				<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
					<i
						className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300"
						aria-hidden
					/>
					<p>{strings("page.reports.churn.empty.selectSale")}</p>
				</div>
			)}

			{loading && (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-20 animate-pulse rounded-xl bg-slate-100"
							/>
						))}
					</div>
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-xl bg-slate-100"
						/>
					))}
				</div>
			)}

			{reportData !== null && !loading && reportData.length === 0 && (
				<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
					<i
						className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300"
						aria-hidden
					/>
					<p>{strings("page.reports.churn.empty.noData")}</p>
				</div>
			)}

			{reportData !== null && !loading && reportData.length > 0 && (
				<>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						<StatCard
							label={strings("page.reports.churn.stats.users")}
							value={stats.users}
						/>
						<StatCard
							label={strings("page.reports.churn.stats.failedRevenue")}
							value={formatCurrency(stats.totalFailedRevenue)}
						/>
						<StatCard
							label={strings("page.reports.churn.stats.totalFailedBaskets")}
							value={stats.totalFailedBaskets}
						/>
						<StatCard
							label={strings("page.reports.churn.stats.avgSession")}
							value={formatDuration(stats.avgSession)}
						/>
					</div>

					<SalesVsChurnChart
						entries={reportData}
						salesByDay={salesByDay}
						start={startDate}
						end={endDate}
					/>

					<AbandonmentInsights entries={reportData} />

					<div>
						<div className="mb-4 flex gap-1 border-b border-slate-200">
							{[
								{ key: "cards", label: strings("page.reports.tab.cards") },
								{ key: "table", label: strings("page.reports.tab.table") },
							].map(({ key, label }) => (
								<button
									key={key}
									type="button"
									onClick={() => setTab(key)}
									className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
										tab === key
											? "border-slate-900 text-slate-900"
											: "border-transparent text-slate-500 hover:text-slate-700"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{tab === "cards" && (
							<>
								<div className="mb-4 flex flex-wrap gap-2">
									{SEGMENT_ORDER.map((key) => {
										const type = SEGMENT_TYPES[key];
										const isSelected = selectedFilter === key;
										return (
											<button
												key={key}
												type="button"
												onClick={() =>
													setSelectedFilter((prev) =>
														prev === key ? null : key,
													)
												}
												className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
													isSelected
														? `${type.className} ring-2 ring-offset-1 ring-slate-400`
														: "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

						{tab === "table" && (
							<ChurnTable
								entries={filteredEntries}
								filename={`churn-${selectedSaleId}-${startDate}-to-${endDate}.csv`}
							/>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default ChurnReport;
