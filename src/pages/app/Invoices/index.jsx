import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { AsyncSearchInput, Input } from "../../../components/inputs";
import VatBadge from "../../../components/invoices/VatBadge";
import { Modal } from "../../../components/shared";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { useApp } from "../../../context";
import { API_BASE_URL, get, post } from "../../../lib/client";
import { getToken } from "../../../lib/storage";
import strings, { formatCurrency } from "../../../localization";

const LIMIT = 25;

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "—");

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	draft: "bg-slate-100 text-slate-600",
	cancelled: "bg-red-100 text-red-800",
	failed: "bg-red-100 text-red-800",
};

const printInvoice = (id) => {
	const url = `${API_BASE_URL}/invoices/${id}/print?token=${encodeURIComponent(getToken() ?? "")}`;
	window.open(url, "_blank", "noopener");
};

const Invoices = () => {
	const { account } = useApp();
	const isAdmin = account?.type === "account.admin";
	const [, setLocation] = useLocation();

	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);
	const [generateOpen, setGenerateOpen] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [filterEmail, setFilterEmail] = useState("");
	const [selectedMerchant, setSelectedMerchant] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	const {
		register,
		handleSubmit: handleGenerateSubmit,
		reset: resetGenerate,
	} = useForm({
		defaultValues: { start: "", end: "" },
	});

	const loading = fetchedPage !== page;

	useEffect(() => {
		if (!account?.type) return;
		const skip = (page - 1) * LIMIT;
		const params = new URLSearchParams({
			limit: String(LIMIT),
			skip: String(skip),
		});
		if (filterEmail?.trim()) params.set("email", filterEmail.trim());
		const endpoint = isAdmin ? `/invoices?${params}` : `/invoices/my?${params}`;
		setFetchedPage(null);
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
	}, [page, filterEmail, isAdmin, account?.type, reloadKey]);

	const searchMerchants = async (query) => {
		const res = await get(
			`/accounts/search?type=account.merchant&name=${encodeURIComponent(query)}&limit=10`,
		);
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
			setPage(1);
			setReloadKey((k) => k + 1);
		} catch {
			// error shown via client toast
		} finally {
			setGenerating(false);
		}
	};

	const columns = [
		{
			key: "number",
			header: strings("table.invoice.number"),
			headerCell: true,
			render: (r) => (
				<span className="font-mono text-xs text-slate-700">
					{r.number ?? r.id?.slice(0, 8) ?? "—"}
				</span>
			),
		},
		...(isAdmin
			? [
					{
						key: "merchant",
						header: strings("table.invoice.merchant"),
						render: (r) =>
							typeof r.owner === "string"
								? r.owner.slice(0, 8)
								: (r.owner?.name ?? r.buyerSnapshot?.corporate?.name ?? "—"),
					},
				]
			: []),
		{
			key: "tier",
			header: strings("table.invoice.tier"),
			render: (r) =>
				typeof r.tier === "string"
					? r.tier.slice(0, 8)
					: (r.tier?.name ?? "—"),
		},
		{
			key: "period",
			header: strings("table.invoice.period"),
			render: (r) =>
				r.period?.start
					? `${formatDate(r.period.start)} — ${formatDate(r.period.end)}`
					: formatDate(r.createdAt),
		},
		{
			key: "subtotal",
			header: strings("table.invoice.subtotal"),
			align: "right",
			render: (r) => formatCurrency(r.subtotal ?? 0),
		},
		{
			key: "vat",
			header: strings("table.invoice.vat"),
			render: (r) => <VatBadge vat={r.vat} />,
		},
		{
			key: "total",
			header: strings("table.invoice.total"),
			align: "right",
			render: (r) => (
				<span className="font-medium text-slate-900">
					{formatCurrency(r.total ?? 0)}
				</span>
			),
		},
		{
			key: "status",
			header: strings("table.invoice.status"),
			render: (r) => (
				<div className="flex items-center gap-1.5">
					<span
						className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? "bg-slate-100 text-slate-600"}`}
					>
						{r.status ?? "—"}
					</span>
					{r.stripePushError && (
						<span
							className="text-amber-600"
							title={`Stripe push failed: ${r.stripePushError}. Re-run generate to retry.`}
						>
							<i className="fa-solid fa-triangle-exclamation" aria-hidden />
							<span className="sr-only">Stripe push failed</span>
						</span>
					)}
				</div>
			),
		},
		{
			key: "actions",
			header: "",
			render: (r) => {
				const payUrl = r.paymentLink ?? r.stripeHostedInvoiceUrl;
				const canPay = r.status === "pending" && payUrl;
				return (
					<div className="flex items-center justify-end gap-1">
						{canPay && (
							<a
								href={payUrl}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(e) => e.stopPropagation()}
								className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								title={strings("page.invoices.payNow")}
							>
								<i className="fa-solid fa-credit-card" aria-hidden />
								<span className="sr-only">
									{strings("page.invoices.payNow")}
								</span>
							</a>
						)}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								printInvoice(r.id);
							}}
							className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
							aria-label={strings("page.invoices.print")}
							title={strings("page.invoices.print")}
						>
							<i className="fa-solid fa-print" aria-hidden />
						</button>
					</div>
				);
			},
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i
						className="fa-solid fa-file-invoice-dollar text-slate-600"
						aria-hidden
					/>
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
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
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
						if (row.id) setLocation(`/invoices/${row.id}`);
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
				onClose={() => {
					setGenerateOpen(false);
					setSelectedMerchant(null);
				}}
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
						onChange={(val) => {
							if (!val) setSelectedMerchant(null);
						}}
						getOptionLabel={(m) => m.name ?? m.email ?? "—"}
						getOptionValue={(m) => m._id ?? m.id ?? ""}
						renderOption={(m) => (
							<div className="flex flex-col">
								<span className="font-medium text-slate-900">
									{m.name ?? "—"}
								</span>
								<span className="text-xs text-slate-500">{m.email}</span>
							</div>
						)}
						minChars={2}
					/>
					{selectedMerchant && (
						<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
							<span className="font-medium text-slate-900">
								{selectedMerchant.name}
							</span>
							<span className="ml-2 text-slate-500">
								{selectedMerchant.email}
							</span>
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
		</div>
	);
};

export default Invoices;
