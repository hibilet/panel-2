import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import Can from "../../../components/Can";
import AiDraftModal from "../../../components/sales/AiDraftModal";
import SalesCalendar from "../../../components/sales/SalesCalendar";
import { EmptyState, SearchBar } from "../../../components/shared";
import { salesColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import { useApp } from "../../../context";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import { matchesQuery } from "../../../utils/search";

const mapRows = (rows) =>
	(rows ?? []).map((row) => ({
		...row,
		startDate: row.start ?? row.startDate,
	}));

const Sales = () => {
	const [, setLocation] = useLocation();
	const { sales, loading, error: appError, refreshSales, account } = useApp();

	const [pastSales, setPastSales] = useState([]);
	const [pastLoading, setPastLoading] = useState(false);
	const [pastFetched, setPastFetched] = useState(false);
	const [showPastEvents, setShowPastEvents] = useState(false);
	const [pastError, setPastError] = useState(null);
	const [aiDraftOpen, setAiDraftOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [view, setView] = useState("list");

	const filteredSales = useMemo(
		() => (sales ?? []).filter((s) => matchesQuery(s.name, query)),
		[sales, query],
	);
	const filteredPastSales = useMemo(
		() => pastSales.filter((s) => matchesQuery(s.name, query)),
		[pastSales, query],
	);

	// Past events are a separate fetch, so the calendar only shows them once the
	// user has pulled them in - otherwise past months would look empty.
	const calendarSales = useMemo(
		() =>
			showPastEvents
				? [...filteredSales, ...filteredPastSales]
				: filteredSales,
		[showPastEvents, filteredSales, filteredPastSales],
	);

	// Revenue is materialized by the billing sweep into sale.stats, so it is a
	// cheap read - always include it instead of gating behind a button.
	useEffect(() => {
		refreshSales({ revenue: true });
	}, [refreshSales]);

	const handleViewPastEvents = () => {
		const next = !showPastEvents;
		setShowPastEvents(next);
		if (next && !pastFetched) {
			setPastFetched(true);
			setPastLoading(true);
			get("/sales?past=true&revenue=true")
				.then((res) => setPastSales(mapRows(res.data)))
				.catch((err) =>
					setPastError(err?.message ?? strings("error.failedLoadPastEvents")),
				)
				.finally(() => setPastLoading(false));
		}
	};

	if (appError && sales.length === 0) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{appError}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.sales.title")}
				</h1>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
						{[
							{
								id: "list",
								icon: "fa-list",
								label: strings("page.sales.viewList"),
							},
							{
								id: "calendar",
								icon: "fa-calendar-days",
								label: strings("page.sales.viewCalendar"),
							},
						].map((opt) => (
							<button
								key={opt.id}
								type="button"
								onClick={() => setView(opt.id)}
								aria-pressed={view === opt.id}
								className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${
									view === opt.id
										? "bg-slate-900 text-white"
										: "text-slate-600 hover:bg-slate-50"
								}`}
							>
								<i className={`fa-solid ${opt.icon}`} aria-hidden />
								{opt.label}
							</button>
						))}
					</div>
					{account?.type === "account.merchant" && (
						<>
							<Can family="ai">
								<button
									type="button"
									onClick={() => setAiDraftOpen(true)}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 active:bg-violet-100"
								>
									<i className="fa-solid fa-sparkles" aria-hidden />
									{strings("ai.draft.button")}
								</button>
							</Can>
							<Link
								href="/sales/new"
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{strings("page.sales.createNew")}
							</Link>
						</>
					)}
				</div>
			</div>

			{(sales?.length ?? 0) > 5 && (
				<SearchBar
					value={query}
					onChange={setQuery}
					placeholder={strings("page.sales.searchPlaceholder")}
				/>
			)}

			{!loading && (sales?.length ?? 0) === 0 ? (
				<EmptyState
					icon="fa-calendar-plus"
					title={strings("page.sales.empty")}
					description={strings("page.sales.emptyDesc")}
					action={
						account?.type === "account.merchant" && (
							<Link
								href="/sales/new"
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
							>
								<i className="fa-solid fa-plus" aria-hidden />
								{strings("page.sales.createNew")}
							</Link>
						)
					}
				/>
			) : view === "calendar" ? (
				<SalesCalendar
					sales={calendarSales}
					loading={loading}
					onSelect={(sale) => setLocation(`/sales/${sale.id}`)}
				/>
			) : (
				<DataTable
					data={filteredSales}
					columns={salesColumns()}
					getRowKey={(r) => r.id ?? r.name}
					onRowClick={(row) => row.id && setLocation(`/sales/${row.id}`)}
					loading={loading}
					emptyMessage={strings("common.noResults")}
				/>
			)}

			<div className="flex flex-col gap-4">
				<button
					type="button"
					onClick={handleViewPastEvents}
					className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{showPastEvents
						? strings("page.sales.hidePastEvents")
						: strings("page.sales.viewPastEvents")}
				</button>
				{showPastEvents && (
					<>
						{pastError ? (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
								{pastError}
							</div>
						) : view === "calendar" ? null : (
							<DataTable
								data={filteredPastSales}
								columns={salesColumns(false)}
								getRowKey={(r) => r.id ?? r.name}
								onRowClick={(row) => row.id && setLocation(`/sales/${row.id}`)}
								loading={pastLoading}
							/>
						)}
					</>
				)}
			</div>

			<AiDraftModal
				isOpen={aiDraftOpen}
				onClose={() => setAiDraftOpen(false)}
				onCreated={() => refreshSales({ revenue: true })}
			/>
		</div>
	);
};

export default Sales;
