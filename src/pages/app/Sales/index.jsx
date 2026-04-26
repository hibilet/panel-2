import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import AiDraftModal from "../../../components/sales/AiDraftModal";
import { Modal, SearchBar } from "../../../components/shared";
import { salesColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import { useApp } from "../../../context";
import { del, get } from "../../../lib/client";
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
	const [showMore, setShowMore] = useState(false);
	const [revenueMode, setRevenueMode] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [aiDraftOpen, setAiDraftOpen] = useState(false);
	const [query, setQuery] = useState("");

	const filteredSales = useMemo(
		() => (sales ?? []).filter((s) => matchesQuery(s.name, query)),
		[sales, query],
	);
	const filteredPastSales = useMemo(
		() => pastSales.filter((s) => matchesQuery(s.name, query)),
		[pastSales, query],
	);

	useEffect(() => {
		if (revenueMode) refreshSales({ revenue: true });
	}, [revenueMode, refreshSales]);

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

	const handleCalculateRevenues = () => setRevenueMode(true);

	const handleDelete = (id) => {
		setDeleteTarget(id);
	};

	const confirmDelete = () => {
		if (!deleteTarget) return;
		del(`/sales/${deleteTarget}`)
			.then(() => refreshSales({ revenue: revenueMode }))
			.catch(() => {});
		setDeleteTarget(null);
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
					<button
						type="button"
						onClick={() => setShowMore((v) => !v)}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{showMore
							? strings("page.sales.showLess")
							: strings("page.sales.showMore")}
					</button>
					<button
						type="button"
						onClick={handleCalculateRevenues}
						disabled={loading}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{strings("page.sales.calculateRevenues")}
					</button>
					{account?.type === "account.merchant" && (
						<>
							<button
								type="button"
								onClick={() => setAiDraftOpen(true)}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 active:bg-violet-100"
							>
								<i className="fa-solid fa-sparkles" aria-hidden />
								{strings("ai.draft.button")}
							</button>
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

			<DataTable
				data={filteredSales}
				columns={salesColumns(showMore, showMore ? handleDelete : undefined)}
				getRowKey={(r) => r.id ?? r.name}
				onRowClick={(row) => row.id && setLocation(`/sales/${row.id}`)}
				loading={loading}
			/>

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
						) : (
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
				onCreated={() => refreshSales({ revenue: revenueMode })}
			/>

			<Modal
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				title={strings("confirm.deleteSale")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setDeleteTarget(null)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={confirmDelete}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-700"
						>
							{strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.deleteSaleBody")}
				</p>
			</Modal>
		</div>
	);
};

export default Sales;
