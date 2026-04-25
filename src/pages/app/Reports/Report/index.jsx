import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Modal } from "../../../../components/shared";
import { StatCard } from "../../../../components/shared";
import { Input } from "../../../../components/inputs";
import { del, get, put } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";
import SalesReportView from "./SalesReportView";

const SEGMENT_TYPES = {
	upsell:                  { labelKey: "page.reports.churn.segment.upsell",                  className: "bg-violet-100 text-violet-800" },
	high_value:              { labelKey: "page.reports.churn.segment.high_value",              className: "bg-amber-100 text-amber-800" },
	loyal_merchant_customer: { labelKey: "page.reports.churn.segment.loyal_merchant_customer", className: "bg-emerald-100 text-emerald-800" },
	excellent_lead:          { labelKey: "page.reports.churn.segment.excellent_lead",          className: "bg-sky-100 text-sky-800" },
	good_lead:               { labelKey: "page.reports.churn.segment.good_lead",               className: "bg-teal-100 text-teal-800" },
	group_organizer:         { labelKey: "page.reports.churn.segment.group_organizer",         className: "bg-indigo-100 text-indigo-800" },
	deadline_abandoner:      { labelKey: "page.reports.churn.segment.deadline_abandoner",      className: "bg-orange-100 text-orange-800" },
	medium_signal_lead:      { labelKey: "page.reports.churn.segment.medium_signal_lead",      className: "bg-slate-200 text-slate-700" },
	low_signal_lead:         { labelKey: "page.reports.churn.segment.low_signal_lead",         className: "bg-slate-100 text-slate-500" },
};

const SEGMENT_ORDER = [
	"upsell", "high_value", "loyal_merchant_customer", "excellent_lead",
	"good_lead", "group_organizer", "deadline_abandoner", "medium_signal_lead", "low_signal_lead",
];

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "-");

const formatDuration = (seconds) => {
	if (seconds == null || Number.isNaN(Number(seconds))) return "-";
	const s = Number(seconds);
	if (s < 60) return `${Math.round(s)}s`;
	const m = Math.floor(s / 60);
	const sec = Math.round(s % 60);
	return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
};

// Leads Summary Tab - segment breakdown from leads_data
const LeadsSummary = ({ leadsData }) => {
	const [expandedSegment, setExpandedSegment] = useState(null);

	if (!Array.isArray(leadsData) || leadsData.length === 0) {
		return (
			<div className="py-12 text-center text-slate-500">
				<i className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300" aria-hidden />
				<p>{strings("page.reports.noLeadsData")}</p>
			</div>
		);
	}

	// Group by segment
	const grouped = {};
	for (const lead of leadsData) {
		const seg = lead.segment ?? "unknown";
		if (!grouped[seg]) grouped[seg] = [];
		grouped[seg].push(lead);
	}

	const rows = SEGMENT_ORDER.filter((s) => grouped[s]).map((seg) => {
		const leads = grouped[seg];
		return {
			segment: seg,
			count: leads.length,
			totalFailedRevenue: leads.reduce((s, l) => s + (Number(l.totalFailedRevenue) || 0), 0),
			leads,
		};
	});

	return (
		<div className="space-y-2">
			<div className="overflow-hidden rounded-xl border border-slate-200">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-slate-200 bg-slate-50">
							<th className="px-4 py-3 text-left font-medium text-slate-600">{strings("page.reports.col.segment")}</th>
							<th className="px-4 py-3 text-right font-medium text-slate-600">{strings("page.reports.col.count")}</th>
							<th className="px-4 py-3 text-right font-medium text-slate-600">{strings("page.reports.col.failedRevenue")}</th>
							<th className="w-10 px-4 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{rows.map(({ segment, count, totalFailedRevenue, leads }) => {
							const info = SEGMENT_TYPES[segment];
							const isExpanded = expandedSegment === segment;
							return (
								<>
									<tr
										key={segment}
										className="cursor-pointer hover:bg-slate-50"
										onClick={() => setExpandedSegment(isExpanded ? null : segment)}
									>
										<td className="px-4 py-3">
											<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info?.className ?? "bg-slate-100 text-slate-600"}`}>
												{info ? strings(info.labelKey) : segment}
											</span>
										</td>
										<td className="px-4 py-3 text-right font-medium text-slate-900">{count}</td>
										<td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(totalFailedRevenue)}</td>
										<td className="px-4 py-3 text-right text-slate-400">
											<i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"} text-xs`} aria-hidden />
										</td>
									</tr>
									{isExpanded && leads.map((lead) => (
										<tr key={lead.userId ?? lead._id} className="bg-slate-50/50">
											<td colSpan={4} className="px-4 py-2">
												<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
													<div>
														<span className="font-medium text-slate-900">{lead.owner?.name ?? lead.userId ?? "-"}</span>
														{lead.owner?.email && (
															<span className="ml-2 text-slate-500">{lead.owner.email}</span>
														)}
													</div>
													<div className="flex flex-wrap gap-3 text-slate-600">
														<span>{strings("page.reports.churn.failedRevenue")}: <strong>{formatCurrency(Number(lead.totalFailedRevenue) || 0)}</strong></span>
														<span>{strings("page.reports.churn.failedBaskets")}: <strong>{lead.totalFailedBaskets ?? 0}</strong></span>
														{lead.isPaidCustomer && (
															<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
																{strings("page.reports.churn.paidCustomer")}
															</span>
														)}
													</div>
												</div>
											</td>
										</tr>
									))}
								</>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};

// Raw Data Tab - full detail cards from raw_data
const RawDataCard = ({ entry }) => {
	const [expanded, setExpanded] = useState(false);
	const owner = entry.owner ?? {};
	const name = owner.name?.trim() ?? entry._id ?? "-";
	const email = owner.email ?? entry._id ?? "-";
	const isPaid = !!entry.isPaidCustomer;
	const segmentInfo = SEGMENT_TYPES[entry.segment] ?? null;
	const failedBaskets = entry.failedBaskets ?? [];
	const successfulBaskets = entry.allSuccessfulBasketsEver ?? [];

	return (
		<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex w-full items-start justify-between gap-3 p-4 text-left"
			>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium text-slate-900">{name}</span>
						<span className="text-sm text-slate-500">{email}</span>
					</div>
					<div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
						<span>{strings("page.reports.churn.failedRevenue")}: <strong>{formatCurrency(Number(entry.totalFailedRevenue) || 0)}</strong></span>
						<span>{strings("page.reports.churn.failedBaskets")}: <strong>{Number(entry.totalFailedBaskets) || 0}</strong></span>
						<span>{strings("page.reports.churn.avgSessionDuration")}: <strong>{formatDuration(entry.avgFailedSessionTime)}</strong></span>
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap items-start gap-1.5">
					{segmentInfo && (
						<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${segmentInfo.className}`}>
							{strings(segmentInfo.labelKey)}
						</span>
					)}
					<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
						{isPaid ? strings("page.reports.churn.paidCustomer") : strings("page.reports.churn.notPaid")}
					</span>
					<i className={`fa-solid fa-chevron-${expanded ? "up" : "down"} mt-0.5 text-xs text-slate-400`} aria-hidden />
				</div>
			</button>

			{expanded && (
				<div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
					{failedBaskets.length > 0 && (
						<div>
							<p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{strings("page.reports.churn.failedEvents")}</p>
							<div className="space-y-2">
								{failedBaskets.map((fb, i) => (
									<div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span className="font-medium text-slate-700">{fb.sale ?? "-"}</span>
											<span className="text-slate-500">{formatDuration(fb.sessionTimeSeconds)}</span>
										</div>
										{Array.isArray(fb.reservations) && fb.reservations.length > 0 && (
											<ul className="mt-1.5 space-y-0.5">
												{fb.reservations.map((r, j) => (
													<li key={j} className="flex justify-between text-xs text-slate-600">
														<span>{r.name}</span>
														<span>{formatCurrency(r.price)}</span>
													</li>
												))}
											</ul>
										)}
										{fb.hasReturned && (
											<p className="mt-1 text-xs text-emerald-600">
												<i className="fa-solid fa-check mr-1" aria-hidden />
												{strings("page.reports.churn.successfulEvents")} ({formatDuration(fb.timeToReturnSeconds)})
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}
					{successfulBaskets.length > 0 && (
						<div>
							<p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{strings("page.reports.churn.successfulEvents")}</p>
							<div className="space-y-1">
								{successfulBaskets.map((sb, i) => (
									<div key={i} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-sm">
										<span className="text-slate-700">{sb.sale_name ?? sb.sale ?? "-"}</span>
										<span className="font-medium text-emerald-700">{formatCurrency(Number(sb.basketTotal) || 0)}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const Report = () => {
	const { id } = useParams();

	const [report, setReport] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("leads");

	// Rename modal
	const [renameOpen, setRenameOpen] = useState(false);
	const [renameName, setRenameName] = useState("");
	const [renaming, setRenaming] = useState(false);

	// Delete confirm
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (!id) return;
		setLoading(true);
		setError(null);
		get(`/reports/${id}`)
			.then((res) => setReport(res.data ?? null))
			.catch((err) => setError(err?.message ?? strings("error.failedLoad")))
			.finally(() => setLoading(false));
	}, [id]);

	const handleRename = async () => {
		if (!renameName.trim()) return;
		setRenaming(true);
		try {
			const res = await put(`/reports/${id}`, { name: renameName.trim() });
			setReport((prev) => ({ ...prev, name: res.data?.name ?? renameName.trim() }));
			setRenameOpen(false);
		} catch {
			// toast handled by client
		} finally {
			setRenaming(false);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await del(`/reports/${id}`);
			window.history.back();
		} catch {
			// toast handled by client
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
				<div className="h-12 w-64 animate-pulse rounded-xl bg-slate-100" />
				<div className="h-64 animate-pulse rounded-xl bg-slate-100" />
			</div>
		);
	}

	if (error || !report) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<Link href="/reports" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.reports")}
				</Link>
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error ?? strings("error.failedLoad")}
				</div>
			</div>
		);
	}

	const segmentInfo = report.type ? SEGMENT_TYPES[report.type] : null;
	const leadsData = report.leads_data ?? [];
	const rawData = report.raw_data ?? [];
	const isSalesReport = report.type === "sales";

	const totalFailedRevenue = rawData.reduce((s, e) => s + (Number(e.totalFailedRevenue) || 0), 0);
	const totalUsers = rawData.length;
	const totalFailedBaskets = rawData.reduce((s, e) => s + (Number(e.totalFailedBaskets) || 0), 0);

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link href="/reports" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.reports")}
			</Link>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl font-semibold text-slate-900">{report.name}</h1>
						<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
							report.type === "churn"
								? "bg-violet-100 text-violet-800"
								: report.type === "sales"
									? "bg-emerald-100 text-emerald-800"
									: "bg-sky-100 text-sky-800"
						}`}>
							{report.type}
						</span>
						{report.type === "sales" && report.params?.period && (
							<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
								{strings(`page.reports.sales.period.${report.params.period}`)}
							</span>
						)}
					</div>
					<p className="mt-1 text-sm text-slate-500">
						{formatDate(report.start)} - {formatDate(report.end)}
						{report.createdAt && (
							<span className="ml-3">{strings("page.reports.generatedOn")} {formatDate(report.createdAt)}</span>
						)}
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={() => { setRenameName(report.name); setRenameOpen(true); }}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{strings("page.reports.rename")}
					</button>
					<button
						type="button"
						onClick={() => setDeleteOpen(true)}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{strings("common.delete")}
					</button>
				</div>
			</div>

			{isSalesReport ? (
				<SalesReportView report={report} />
			) : (
				<>
					{/* Stats */}
					{rawData.length > 0 && (
						<div className="grid grid-cols-3 gap-4">
							<StatCard label={strings("page.reports.churn.stats.users")} value={totalUsers} />
							<StatCard label={strings("page.reports.churn.stats.failedRevenue")} value={formatCurrency(totalFailedRevenue)} />
							<StatCard label={strings("page.reports.churn.stats.totalFailedBaskets")} value={totalFailedBaskets} />
						</div>
					)}

					{/* Tabs */}
					<div>
						<div className="mb-4 flex gap-1 border-b border-slate-200">
							{[
								{ key: "leads", label: strings("page.reports.tab.leads") },
								{ key: "raw", label: strings("page.reports.tab.raw") },
							].map(({ key, label }) => (
								<button
									key={key}
									type="button"
									onClick={() => setActiveTab(key)}
									className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
										activeTab === key
											? "border-slate-900 text-slate-900"
											: "border-transparent text-slate-500 hover:text-slate-700"
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{activeTab === "leads" && <LeadsSummary leadsData={leadsData} />}

						{activeTab === "raw" && (
							<div className="space-y-3">
								{rawData.length === 0 ? (
									<div className="py-12 text-center text-slate-500">
										<i className="fa-solid fa-chart-line mb-3 text-4xl text-slate-300" aria-hidden />
										<p>{strings("page.reports.noLeadsData")}</p>
									</div>
								) : (
									rawData.map((entry) => (
										<RawDataCard key={entry._id ?? entry.userId} entry={entry} />
									))
								)}
							</div>
						)}
					</div>
				</>
			)}

			{/* Rename Modal */}
			<Modal
				isOpen={renameOpen}
				onClose={() => !renaming && setRenameOpen(false)}
				title={strings("page.reports.rename")}
				footer={
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => setRenameOpen(false)}
							disabled={renaming}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleRename}
							disabled={!renameName.trim() || renaming}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{renaming ? strings("common.saving") : strings("common.save")}
						</button>
					</div>
				}
			>
				<Input
					label={strings("common.name")}
					name="renameName"
					value={renameName}
					onChange={(e) => setRenameName(e.target.value)}
					disabled={renaming}
				/>
			</Modal>

			{/* Delete Confirm Modal */}
			<Modal
				isOpen={deleteOpen}
				onClose={() => !deleting && setDeleteOpen(false)}
				title={strings("page.reports.deleteConfirm")}
				footer={
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => setDeleteOpen(false)}
							disabled={deleting}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleting}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{deleting ? strings("common.saving") : strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("page.reports.deleteConfirmBody", [report.name])}
				</p>
			</Modal>
		</div>
	);
};

export default Report;
