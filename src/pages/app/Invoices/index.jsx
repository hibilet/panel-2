import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useLocation } from "wouter";
import { AsyncSearchInput, Input } from "../../../components/inputs";
import { Modal, SlidePanel } from "../../../components/shared";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { useApp } from "../../../context";
import { get, post } from "../../../lib/client";
import strings, { formatCurrency } from "../../../localization";
import InvoicePanel from "./Invoice";

const LIMIT = 25;

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "—");

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	draft: "bg-slate-100 text-slate-600",
	cancelled: "bg-red-100 text-red-800",
};

const Invoices = () => {
	const { account } = useApp();
	const isAdmin = account?.type === "account.admin";
	const { id } = useParams();
	const [, setLocation] = useLocation();

	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);
	const [selectedInvoice, setSelectedInvoice] = useState(null);
	const [generateOpen, setGenerateOpen] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [filterEmail, setFilterEmail] = useState("");
	const [selectedMerchant, setSelectedMerchant] = useState(null);

	const { register, handleSubmit: handleGenerateSubmit, reset: resetGenerate } = useForm({
		defaultValues: { start: "", end: "" },
	});

	const loading = fetchedPage !== page;

	useEffect(() => {
		if (!account?.type) return;
		const skip = (page - 1) * LIMIT;
		const params = new URLSearchParams({ limit: String(LIMIT), skip: String(skip) });
		if (filterEmail?.trim()) params.set("email", filterEmail.trim());
		const endpoint = isAdmin ? `/invoices?${params}` : `/invoices/my?${params}`;
		get(endpoint)
			.then((res) => {
				setData(Array.isArray(res.data?.invoices) ? res.data.invoices : []);
				setTotal(res.data?.total ?? 0);
				setFetchedPage(page);
				setError(null);
			})
			.catch((err) => {
				setError(err?.message ?? strings("error.failedLoadInvoices"));
				setFetchedPage(page);
			});
	}, [page, filterEmail, isAdmin, account?.type]);

	// Sync selected invoice when id param changes
	useEffect(() => {
		if (id) {
			const found = data.find((inv) => inv.id === id);
			if (found) setSelectedInvoice(found);
		} else {
			setSelectedInvoice(null);
		}
	}, [id, data]);

	const searchMerchants = async (query) => {
		const res = await get(`/accounts/search?type=account.merchant&name=${encodeURIComponent(query)}&limit=10`);
		return res.data ?? [];
	};

	const onGenerate = async (formData) => {
		setGenerating(true);
		try {
			await post("/invoices/generate", {
				merchantId: selectedMerchant?._id ?? selectedMerchant?.id ?? undefined,
				start: formData.start || undefined,
				end: formData.end || undefined,
			});
			setGenerateOpen(false);
			resetGenerate();
			setSelectedMerchant(null);
			setPage((p) => {
				if (p !== 1) return 1;
				setFetchedPage(null);
				return 1;
			});
		} catch {
			// error shown via client toast
		} finally {
			setGenerating(false);
		}
	};

	const columns = [
		...(isAdmin
			? [
					{
						key: "merchant",
						header: strings("table.invoice.merchant"),
						headerCell: true,
						render: (r) => typeof r.owner === "string" ? r.owner.slice(0, 8) : r.owner?.name ?? "—",
					},
				]
			: []),
		{
			key: "period",
			header: strings("table.invoice.period"),
			render: (r) =>
				r.period?.start
					? `${formatDate(r.period.start)} — ${formatDate(r.period.end)}`
					: formatDate(r.createdAt),
		},
		{
			key: "tier",
			header: strings("table.invoice.tier"),
			render: (r) => r.tier?.name ?? "—",
		},
		{
			key: "ticketFee",
			header: strings("table.invoice.ticketFee"),
			align: "right",
			render: (r) => {
				const bd = r.breakdown ?? {};
				return (bd.ticketFeeAmount ?? 0) > 0 ? formatCurrency(bd.ticketFeeAmount) : "—";
			},
		},
		{
			key: "subtotal",
			header: strings("table.invoice.subtotal"),
			align: "right",
			render: (r) => formatCurrency(r.subtotal ?? 0),
		},
		{
			key: "status",
			header: strings("table.invoice.status"),
			render: (r) => (
				<span
					className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? "bg-slate-100 text-slate-600"}`}
				>
					{r.status ?? "—"}
				</span>
			),
		},
		{
			key: "createdAt",
			header: strings("table.invoice.createdAt"),
			render: (r) => formatDate(r.createdAt),
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i className="fa-solid fa-file-invoice-dollar text-slate-600" aria-hidden />
					{strings("page.invoices.title")}
				</h1>
				<div className="flex items-center gap-2">
					{isAdmin && (
						<button
							type="button"
							onClick={() => {
								resetGenerate();
								setGenerateOpen(true);
							}}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("page.invoices.generate")}
						</button>
					)}
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error}
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={data}
					columns={columns}
					getRowKey={(r) => r.id}
					bare
					loading={loading}
					onRowClick={(row) => {
						if (row.id) {
							setSelectedInvoice(row);
							setLocation(`/invoices/${row.id}`);
						}
					}}
					emptyMessage={strings("table.invoice.noInvoices")}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>

			{/* Generate invoice modal (admin only) */}
			<Modal
				isOpen={generateOpen}
				onClose={() => { setGenerateOpen(false); setSelectedMerchant(null); }}
				title={strings("page.invoices.generate")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setGenerateOpen(false)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="submit"
							form="generate-invoice-form"
							disabled={generating}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{generating ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("page.invoices.generating")}
								</>
							) : (
								<>
									<i className="fa-solid fa-bolt" aria-hidden />
									{strings("page.invoices.generate")}
								</>
							)}
						</button>
					</div>
				}
			>
				<form
					id="generate-invoice-form"
					onSubmit={handleGenerateSubmit(onGenerate)}
					className="space-y-4"
				>
					<AsyncSearchInput
						label={strings("page.invoices.searchMerchant")}
						placeholder={strings("page.invoices.merchantSearchPlaceholder")}
						searchFn={searchMerchants}
						onSelect={(merchant) => setSelectedMerchant(merchant)}
						onChange={(val) => { if (!val) setSelectedMerchant(null); }}
						getOptionLabel={(m) => m.name ?? m.email ?? "—"}
						getOptionValue={(m) => m._id ?? m.id ?? ""}
						renderOption={(m) => (
							<div className="flex flex-col">
								<span className="font-medium text-slate-900">{m.name ?? "—"}</span>
								<span className="text-xs text-slate-500">{m.email}</span>
							</div>
						)}
						minChars={2}
					/>
					{selectedMerchant && (
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
							<span className="font-medium text-slate-900">{selectedMerchant.name}</span>
							<span className="ml-2 text-slate-500">{selectedMerchant.email}</span>
						</div>
					)}
					<div className="grid grid-cols-2 gap-4">
						<Input
							label={strings("page.invoices.startDate")}
							type="date"
							{...register("start")}
						/>
						<Input
							label={strings("page.invoices.endDate")}
							type="date"
							{...register("end")}
						/>
					</div>
				</form>
			</Modal>

			{/* Invoice detail slide panel */}
			<SlidePanel
				isOpen={!!selectedInvoice}
				onClose={() => {
					setSelectedInvoice(null);
					setLocation("/invoices");
				}}
				title={strings("page.invoices.breakdown")}
				aria-label={strings("page.invoices.breakdown")}
			>
				{selectedInvoice && (
					<InvoicePanel
						invoice={selectedInvoice}
						onClose={() => {
							setSelectedInvoice(null);
							setLocation("/invoices");
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Invoices;
