import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Can from "../../../components/Can";
import { Input, Select } from "../../../components/inputs";
import InsightsPanel from "../../../components/reports/InsightsPanel";
import { Modal, SearchBar } from "../../../components/shared";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { useApp } from "../../../context";
import { can } from "../../../lib/capabilities";
import { del, get, post, put } from "../../../lib/client";
import strings from "../../../localization";

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "-");

const TYPE_BADGE = {
	churn: "bg-violet-100 text-violet-800",
	sales: "bg-sky-100 text-sky-800",
};

const STATUS_BADGE = {
	active: "bg-emerald-100 text-emerald-800",
	inactive: "bg-slate-100 text-slate-600",
};

const ALL_TYPE_OPTIONS = [
	{ value: "churn", label: "Churn", caps: ["reporting.churn"] },
	{ value: "sales", label: "Sales", caps: ["reporting.sales"] },
];

const defaultStart = () => {
	const d = new Date();
	d.setDate(d.getDate() - 30);
	return d.toISOString().slice(0, 10);
};

const Reports = () => {
	const { account, sales: contextSales } = useApp();
	const [, setLocation] = useLocation();
	const isAdmin = account?.type === "account.admin";
	const typeOptions = useMemo(
		() =>
			isAdmin
				? ALL_TYPE_OPTIONS
				: ALL_TYPE_OPTIONS.filter((o) => o.caps.some((c) => can(account, c))),
		[isAdmin, account],
	);

	const [reports, setReports] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [page, setPage] = useState(1);

	// Debounce search input so each keystroke doesn't fire a request.
	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
		return () => clearTimeout(t);
	}, [query]);

	// Reset to page 1 whenever the debounced query changes.
	useEffect(() => {
		setPage(1);
	}, [debouncedQuery]);

	const [pastSales, setPastSales] = useState([]);

	// Create modal
	const [createOpen, setCreateOpen] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [createError, setCreateError] = useState(null);
	const [formType, setFormType] = useState("churn");
	const [formSaleId, setFormSaleId] = useState("");
	const [formStart, setFormStart] = useState(defaultStart);
	const [formEnd, setFormEnd] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [formFrequency, setFormFrequency] = useState("weekly");
	const [quote, setQuote] = useState(null);
	const [quoting, setQuoting] = useState(false);

	// Rename modal
	const [renameTarget, setRenameTarget] = useState(null);
	const [renameName, setRenameName] = useState("");
	const [renaming, setRenaming] = useState(false);

	// Delete confirm
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);

	const PAGE_SIZE = 25;

	const fetchReports = useCallback(() => {
		setLoading(true);
		setError(null);
		const params = new URLSearchParams({
			limit: String(PAGE_SIZE),
			skip: String((page - 1) * PAGE_SIZE),
		});
		if (debouncedQuery) params.set("q", debouncedQuery);
		get(`/reports?${params}`)
			.then((res) => {
				setReports(Array.isArray(res.data) ? res.data : []);
				setTotal(Number(res.total) || 0);
			})
			.catch((err) => setError(err?.message ?? strings("error.failedLoad")))
			.finally(() => setLoading(false));
	}, [page, debouncedQuery]);

	useEffect(() => {
		fetchReports();
	}, [fetchReports]);

	useEffect(() => {
		get("/sales?past=true&revenue=true")
			.then((res) => setPastSales(res.data ?? []))
			.catch(() => {});
	}, []);

	// Server filters via ?q= so the client just renders the page.
	const filteredReports = reports;

	const allSalesOptions = useMemo(() => {
		const seen = new Set();
		return [...(contextSales ?? []), ...pastSales]
			.filter((s) => {
				const id = s.id ?? s._id;
				if (!id || seen.has(id)) return false;
				seen.add(id);
				return true;
			})
			.map((s) => ({ value: s.id ?? s._id, label: s.name }));
	}, [contextSales, pastSales]);

	const openCreate = () => {
		setFormType("churn");
		setFormSaleId("");
		setFormStart(defaultStart());
		setFormEnd(new Date().toISOString().slice(0, 10));
		setFormFrequency("weekly");
		setQuote(null);
		setCreateError(null);
		setCreateOpen(true);
	};

	useEffect(() => {
		if (
			!createOpen ||
			!formSaleId ||
			!formType ||
			!formFrequency ||
			!formStart ||
			!formEnd
		) {
			setQuote(null);
			return;
		}
		setQuoting(true);
		const url = `/sales/${formSaleId}/reports/range/quote?type=${formType}&frequency=${formFrequency}&start=${formStart}&end=${formEnd}`;
		get(url)
			.then((res) => setQuote(res?.data ?? null))
			.catch(() => setQuote(null))
			.finally(() => setQuoting(false));
	}, [createOpen, formSaleId, formType, formFrequency, formStart, formEnd]);

	const handleGenerate = async () => {
		if (!formSaleId || !formStart || !formEnd) return;
		setGenerating(true);
		setCreateError(null);
		try {
			const body = {
				type: formType,
				frequency: formFrequency,
				start: formStart,
				end: formEnd,
			};
			const res = await post(`/sales/${formSaleId}/reports/range`, body);
			setCreateOpen(false);
			const id = res.data?.report?.id ?? res.data?.report?._id;
			if (id) setLocation(`/reports/${id}`);
			else fetchReports();
		} catch (err) {
			setCreateError(err?.message ?? strings("error.failedLoad"));
		} finally {
			setGenerating(false);
		}
	};

	const handleRename = async () => {
		if (!renameName.trim() || !renameTarget) return;
		setRenaming(true);
		try {
			await put(`/reports/${renameTarget.id}`, { name: renameName.trim() });
			setRenameTarget(null);
			fetchReports();
		} catch {
			// toast handled by client
		} finally {
			setRenaming(false);
		}
	};

	const handleArchive = async (report) => {
		const next = report.status === "inactive" ? "active" : "inactive";
		await put(`/reports/${report.id}`, { status: next });
		fetchReports();
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await del(`/reports/${deleteTarget.id}`);
			setDeleteTarget(null);
			fetchReports();
		} catch {
			// toast handled by client
		} finally {
			setDeleting(false);
		}
	};

	const columns = [
		{
			key: "period",
			header: strings("page.reports.col.period"),
			headerCell: true,
			render: (row) => (
				<span className="text-sm text-slate-600">
					{formatDate(row.end)} - {formatDate(row.start)}
				</span>
			),
		},
		{
			key: "name",
			header: strings("page.reports.col.name"),
		},
		{
			key: "type",
			header: strings("page.reports.col.type"),
			render: (row) => (
				<span
					className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[row.type] ?? "bg-slate-100 text-slate-600"}`}
				>
					{row.type}
				</span>
			),
		},
		{
			key: "status",
			header: strings("common.status"),
			render: (row) => (
				<span
					className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? "bg-slate-100 text-slate-600"}`}
				>
					{strings(
						row.status === "inactive" ? "common.inactive" : "common.active",
					)}
				</span>
			),
		},
		{
			key: "createdAt",
			header: strings("page.reports.col.created"),
			render: (row) => (
				<span className="text-sm text-slate-500">
					{formatDate(row.createdAt)}
				</span>
			),
		},
		...(isAdmin
			? [
					{
						key: "owner",
						header: strings("page.reports.col.owner"),
						render: (row) => (
							<span className="text-sm text-slate-600">
								{typeof row.owner === "object" ? row.owner?.name : row.owner}
							</span>
						),
					},
				]
			: []),
		{
			key: "actions",
			header: "",
			align: "right",
			render: (row) => (
				<div className="flex items-center justify-end gap-3">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setRenameTarget(row);
							setRenameName(row.name);
						}}
						className="text-xs text-slate-500 hover:text-slate-900"
					>
						{strings("page.reports.rename")}
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleArchive(row);
						}}
						className="text-xs text-slate-500 hover:text-slate-900"
					>
						{row.status === "inactive"
							? strings("common.unarchive")
							: strings("common.archive")}
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setDeleteTarget(row);
						}}
						className="text-xs text-red-500 hover:text-red-700"
					>
						{strings("common.delete")}
					</button>
				</div>
			),
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.reports.title")}
				</h1>
				<Can family="reporting">
					<button
						type="button"
						onClick={openCreate}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{strings("page.reports.createReport")}
					</button>
				</Can>
			</div>

			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			<Can cap="ai.report.summary">
				<InsightsPanel />
			</Can>

			{(total > 5 || query) && (
				<SearchBar
					value={query}
					onChange={setQuery}
					placeholder={strings("page.reports.searchPlaceholder")}
				/>
			)}

			<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={filteredReports}
					columns={columns}
					getRowKey={(r) => r.id ?? r._id}
					loading={loading}
					onRowClick={(row) => row.id && setLocation(`/reports/${row.id}`)}
					emptyMessage={strings("page.reports.noReports")}
				/>
			</div>

			<Pagination
				total={total}
				limit={PAGE_SIZE}
				page={page}
				onPageChange={setPage}
			/>

			{/* Create Report Modal */}
			<Modal
				isOpen={createOpen}
				onClose={() => !generating && setCreateOpen(false)}
				title={strings("page.reports.createReport")}
				maxWidth="lg"
				footer={
					<div className="flex items-center justify-between gap-3">
						{generating && (
							<p className="text-sm text-slate-500">
								<i className="fa-solid fa-circle-info mr-1.5" aria-hidden />
								{strings("page.reports.generatingHint")}
							</p>
						)}
						<div className="ml-auto flex gap-3">
							<button
								type="button"
								onClick={() => setCreateOpen(false)}
								disabled={generating}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{strings("common.cancel")}
							</button>
							<button
								type="button"
								onClick={handleGenerate}
								disabled={!formSaleId || !formStart || !formEnd || generating}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{generating && (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								)}
								{generating
									? strings("page.reports.churn.generating")
									: strings("page.reports.createReport")}
							</button>
						</div>
					</div>
				}
			>
				<div className="space-y-4">
					<Select
						label={strings("page.reports.reportType")}
						name="reportType"
						value={formType}
						onChange={(e) => setFormType(e.target.value)}
						options={typeOptions}
						disabled={generating || typeOptions.length === 0}
					/>
					<Select
						label={strings("page.reports.churn.selectSale")}
						name="sale"
						value={formSaleId}
						onChange={(e) => setFormSaleId(e.target.value)}
						options={allSalesOptions}
						placeholder={strings("page.reports.churn.selectSale")}
						disabled={generating}
					/>
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-700">
							{strings("page.reports.frequency")}
						</label>
						<div className="flex gap-2">
							{["daily", "weekly", "monthly"].map((f) => (
								<button
									type="button"
									key={f}
									onClick={() => setFormFrequency(f)}
									disabled={generating}
									className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
										formFrequency === f
											? "border-slate-900 bg-slate-900 text-white"
											: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
									}`}
								>
									{strings(`page.sale.reporting.freq.${f}`)}
								</button>
							))}
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<Input
							label={strings("page.reports.churn.startDate")}
							type="date"
							name="start"
							value={formStart}
							onChange={(e) => setFormStart(e.target.value)}
							disabled={generating}
						/>
						<Input
							label={strings("page.reports.churn.endDate")}
							type="date"
							name="end"
							value={formEnd}
							onChange={(e) => setFormEnd(e.target.value)}
							disabled={generating}
						/>
					</div>
					<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
						{quoting ? (
							<span className="text-slate-500">
								<i className="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden />
								{strings("page.reports.quoting")}
							</span>
						) : quote ? (
							quote.total > 0 ? (
								<span className="text-slate-700">
									<i
										className="fa-solid fa-receipt mr-1.5 text-slate-500"
										aria-hidden
									/>
									{strings("page.reports.quoteLine")
										.replace("{units}", String(quote.units))
										.replace(
											"{frequency}",
											strings(`page.sale.reporting.freq.${formFrequency}`),
										)
										.replace("{total}", `${(quote.total ?? 0).toFixed(2)}`)}
								</span>
							) : (
								<span className="text-emerald-700">
									<i className="fa-solid fa-circle-check mr-1.5" aria-hidden />
									{strings("page.sale.reporting.free")}
								</span>
							)
						) : (
							<span className="text-slate-400">
								{strings("page.reports.quoteHint")}
							</span>
						)}
					</div>
					{createError && <p className="text-sm text-red-600">{createError}</p>}
				</div>
			</Modal>

			{/* Rename Modal */}
			<Modal
				isOpen={!!renameTarget}
				onClose={() => !renaming && setRenameTarget(null)}
				title={strings("page.reports.rename")}
				footer={
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => setRenameTarget(null)}
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
				isOpen={!!deleteTarget}
				onClose={() => !deleting && setDeleteTarget(null)}
				title={strings("page.reports.deleteConfirm")}
				footer={
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => setDeleteTarget(null)}
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
					{strings("page.reports.deleteConfirmBody", [
						deleteTarget?.name ?? "",
					])}
				</p>
			</Modal>
		</div>
	);
};

export default Reports;
