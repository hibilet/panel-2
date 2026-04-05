import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Input, Select } from "../../../components/inputs";
import { Modal } from "../../../components/shared";
import DataTable from "../../../components/tables/DataTable";
import { useApp } from "../../../context";
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

const TYPE_OPTIONS = [
	{ value: "churn", label: "Churn" },
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

	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [pastSales, setPastSales] = useState([]);

	// Create modal
	const [createOpen, setCreateOpen] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [createError, setCreateError] = useState(null);
	const [formName, setFormName] = useState("");
	const [formType, setFormType] = useState("churn");
	const [formSaleId, setFormSaleId] = useState("");
	const [formStart, setFormStart] = useState(defaultStart);
	const [formEnd, setFormEnd] = useState(() => new Date().toISOString().slice(0, 10));
	const [formHvThreshold, setFormHvThreshold] = useState("100");

	// Rename modal
	const [renameTarget, setRenameTarget] = useState(null);
	const [renameName, setRenameName] = useState("");
	const [renaming, setRenaming] = useState(false);

	// Delete confirm
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);

	const fetchReports = useCallback(() => {
		setLoading(true);
		setError(null);
		get("/reports")
			.then((res) => setReports(Array.isArray(res.data) ? res.data : []))
			.catch((err) => setError(err?.message ?? strings("error.failedLoad")))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		fetchReports();
	}, [fetchReports]);

	useEffect(() => {
		get("/sales?past=true&revenue=true")
			.then((res) => setPastSales(res.data ?? []))
			.catch(() => {});
	}, []);

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
		setFormName("");
		setFormType("churn");
		setFormSaleId("");
		setFormStart(defaultStart());
		setFormEnd(new Date().toISOString().slice(0, 10));
		setFormHvThreshold("100");
		setCreateError(null);
		setCreateOpen(true);
	};

	const handleGenerate = async () => {
		if (!formName.trim() || !formSaleId) return;
		setGenerating(true);
		setCreateError(null);
		try {
			const body = {
				name: formName.trim(),
				type: formType,
				sale: formSaleId,
				start: formStart || undefined,
				end: formEnd || undefined,
			};
			if (formType === "churn" && formHvThreshold) {
				body.highValueThreshold = Number(formHvThreshold);
			}
			const res = await post("/reports", body);
			setCreateOpen(false);
			const id = res.data?.id ?? res.data?._id;
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
			key: "name",
			header: strings("page.reports.col.name"),
			render: (row) => (
				<button
					type="button"
					onClick={() => setLocation(`/reports/${row.id}`)}
					className="text-left font-medium text-slate-900 hover:underline"
				>
					{row.name}
				</button>
			),
		},
		{
			key: "type",
			header: strings("page.reports.col.type"),
			render: (row) => (
				<span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[row.type] ?? "bg-slate-100 text-slate-600"}`}>
					{row.type}
				</span>
			),
		},
		{
			key: "period",
			header: strings("page.reports.col.period"),
			render: (row) => (
				<span className="text-sm text-slate-600">
					{formatDate(row.start)} - {formatDate(row.end)}
				</span>
			),
		},
		{
			key: "status",
			header: strings("common.status"),
			render: (row) => (
				<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? "bg-slate-100 text-slate-600"}`}>
					{strings(row.status === "inactive" ? "common.inactive" : "common.active")}
				</span>
			),
		},
		{
			key: "createdAt",
			header: strings("page.reports.col.created"),
			render: (row) => <span className="text-sm text-slate-500">{formatDate(row.createdAt)}</span>,
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
						onClick={() => setLocation(`/reports/${row.id}`)}
						className="text-xs text-slate-500 hover:text-slate-900"
					>
						{strings("common.edit")}
					</button>
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
						onClick={(e) => { e.stopPropagation(); handleArchive(row); }}
						className="text-xs text-slate-500 hover:text-slate-900"
					>
						{row.status === "inactive" ? strings("common.unarchive") : strings("common.archive")}
					</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
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
				<button
					type="button"
					onClick={openCreate}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
				>
					<i className="fa-solid fa-plus" aria-hidden />
					{strings("page.reports.createReport")}
				</button>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={reports}
					columns={columns}
					getRowKey={(r) => r.id ?? r._id}
					loading={loading}
					emptyMessage={strings("page.reports.noReports")}
				/>
			</div>

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
								className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							>
								{strings("common.cancel")}
							</button>
							<button
								type="button"
								onClick={handleGenerate}
								disabled={!formName.trim() || !formSaleId || generating}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
							>
								{generating && <i className="fa-solid fa-spinner fa-spin" aria-hidden />}
								{generating ? strings("page.reports.churn.generating") : strings("page.reports.createReport")}
							</button>
						</div>
					</div>
				}
			>
				<div className="space-y-4">
					<Input
						label={strings("page.reports.reportName")}
						name="reportName"
						value={formName}
						onChange={(e) => setFormName(e.target.value)}
						placeholder={strings("page.reports.reportNamePlaceholder")}
						disabled={generating}
					/>
					<Select
						label={strings("page.reports.reportType")}
						name="reportType"
						value={formType}
						onChange={(e) => setFormType(e.target.value)}
						options={TYPE_OPTIONS}
						disabled={generating}
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
					{formType === "churn" && (
						<Input
							label={strings("page.reports.hvThreshold")}
							type="number"
							name="hvThreshold"
							value={formHvThreshold}
							onChange={(e) => setFormHvThreshold(e.target.value)}
							disabled={generating}
						/>
					)}
					{createError && (
						<p className="text-sm text-red-600">{createError}</p>
					)}
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
							className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleRename}
							disabled={!renameName.trim() || renaming}
							className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
							className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={deleting}
							className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
						>
							{deleting ? strings("common.saving") : strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("page.reports.deleteConfirmBody", [deleteTarget?.name ?? ""])}
				</p>
			</Modal>
		</div>
	);
};

export default Reports;
