import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { get } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	draft: "bg-slate-100 text-slate-600",
	cancelled: "bg-red-100 text-red-800",
};

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "-");
const formatDateTime = (d) => (d ? dayjs(d).format("D MMM YYYY, HH:mm") : "-");

const Row = ({ label, value, bold }) => (
	<div className="flex items-center justify-between py-2">
		<span className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-500"}`}>
			{label}
		</span>
		<span className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-900"}`}>
			{value}
		</span>
	</div>
);

const Invoice = () => {
	const { id } = useParams();
	const [invoice, setInvoice] = useState(null);
	const [fetchedId, setFetchedId] = useState(null);
	const [error, setError] = useState(null);
	const loading = fetchedId !== id;

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		get(`/invoices/${id}`)
			.then((res) => {
				if (cancelled) return;
				setInvoice(res.data ?? null);
				setError(null);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err?.message ?? strings("error.failedLoadInvoices"));
			})
			.finally(() => {
				if (!cancelled) setFetchedId(id);
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	const bd = invoice?.breakdown ?? {};
	const period = invoice?.period ?? {};
	const payUrl = invoice?.stripeHostedInvoiceUrl ?? invoice?.paymentLink;
	const canPay = invoice?.status === "pending" && payUrl;
	const taxMultiplier = invoice?.tax ?? 0;
	const taxAmount = (invoice?.subtotal ?? 0) * (taxMultiplier > 1 ? taxMultiplier - 1 : taxMultiplier);
	const total = invoice?.total ?? ((invoice?.subtotal ?? 0) + taxAmount);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<Link
				href="/invoices"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.invoices")}
			</Link>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error}
				</div>
			)}

			{loading ? (
				<div className="flex justify-center py-12">
					<i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
				</div>
			) : !invoice ? (
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
					{strings("page.invoices.notFound")}
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<header className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
								<i className="fa-solid fa-file-invoice-dollar text-slate-600" aria-hidden />
								{strings("page.invoices.title")}
							</h1>
							<p className="mt-1 text-sm text-slate-500">
								{typeof invoice.owner === "string"
									? invoice.owner.slice(0, 8)
									: invoice.owner?.name ?? invoice.billing?.corporateName ?? "-"}
							</p>
							{period.start && (
								<p className="mt-0.5 text-xs text-slate-400">
									{formatDate(period.start)} - {formatDate(period.end)}
								</p>
							)}
						</div>
						<div className="flex flex-col items-start gap-2 sm:items-end">
							{invoice.status && (
								<span
									className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[invoice.status] ?? "bg-slate-100 text-slate-600"}`}
								>
									{invoice.status}
								</span>
							)}
							{invoice.kind && (
								<span className="text-xs text-slate-400">
									{strings(`page.invoices.kind.${invoice.kind}`)}
								</span>
							)}
						</div>
					</header>

					<div className="space-y-6 px-6 py-5">
						{invoice.tier && (
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
									{strings("page.invoices.tier")}
								</p>
								<p className="font-medium text-slate-900">
									{invoice.tier?.name ?? invoice.tier}
								</p>
							</div>
						)}

						<div>
							<p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
								{strings("page.invoices.breakdown")}
							</p>
							<div className="rounded-lg border border-slate-200 px-4">
								<Row
									label={strings("page.invoices.salesCount")}
									value={(bd.salesCount ?? invoice.reservations?.length ?? 0).toLocaleString()}
								/>
								<Row
									label={strings("page.invoices.salesTotal")}
									value={formatCurrency(bd.salesTotal ?? 0)}
								/>
								<Row
									label={strings("page.invoices.baseFee")}
									value={formatCurrency(bd.baseFee ?? 0)}
								/>
								{(bd.ticketFeeAmount ?? 0) > 0 && (
									<Row
										label={strings("page.invoices.ticketFee")}
										value={formatCurrency(bd.ticketFeeAmount)}
									/>
								)}
								<Row
									label={strings("page.invoices.commissionAmount")}
									value={formatCurrency(bd.commissionAmount ?? invoice.commision ?? 0)}
								/>
								{(bd.installFee ?? 0) > 0 && (
									<Row
										label={strings("page.invoices.installFee")}
										value={formatCurrency(bd.installFee)}
									/>
								)}
								{(bd.discount ?? 0) > 0 && (
									<Row
										label={strings("page.invoices.discount")}
										value={`-${formatCurrency(bd.discount)}`}
									/>
								)}
							</div>
						</div>

						<div className="rounded-lg border border-slate-200 px-4">
							<Row
								label={strings("page.invoices.subtotal")}
								value={formatCurrency(invoice.subtotal ?? 0)}
							/>
							{taxAmount > 0 && (
								<Row
									label={strings("page.invoices.tax")}
									value={formatCurrency(taxAmount)}
								/>
							)}
							<Row
								label={strings("page.invoices.total")}
								value={formatCurrency(total)}
								bold
							/>
						</div>

						{invoice.status === "paid" && invoice.paidAt && (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
								<i className="fa-solid fa-circle-check mr-1.5" aria-hidden />
								{strings("page.invoices.paidOn", [formatDateTime(invoice.paidAt)])}
							</div>
						)}

						{canPay && (
							<a
								href={payUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
							>
								<i className="fa-solid fa-credit-card" aria-hidden />
								{strings("page.invoices.payNow")}
							</a>
						)}

						{!canPay && payUrl && (
							<a
								href={payUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
							>
								<i className="fa-solid fa-up-right-from-square" aria-hidden />
								{strings("page.invoices.viewOnStripe")}
							</a>
						)}

						<div className="rounded-lg border border-slate-200 px-4 text-xs">
							<Row
								label={strings("detail.id")}
								value={<span className="font-mono text-slate-500">{invoice.id}</span>}
							/>
							<Row
								label={strings("page.invoices.createdAt")}
								value={formatDateTime(invoice.createdAt)}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Invoice;
