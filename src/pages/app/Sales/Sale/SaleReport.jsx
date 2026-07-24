import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";

import { API_BASE_URL, get, post } from "../../../../lib/client";
import { getToken } from "../../../../lib/storage";
import { showToast } from "../../../../lib/toastStore";
import strings from "../../../../localization";
import { maskedCurrency } from "../../../../lib/money";

// Respects panel.money: a viewer without it sees ••• here too, not raw revenue.
// The report values are in cents.
const fmtMoney = (cents, currency) => maskedCurrency((cents || 0) / 100, currency || "EUR");

const PAY_LABEL = {
	klarna: "Klarna", paypal: "PayPal", apple_pay: "Apple Pay", google_pay: "Google Pay",
	card: "Card", sepa_debit: "SEPA Direct Debit", ideal: "iDEAL", unknown: "Unknown",
};

const Tile = ({ label, value }) => (
	<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
		<div className="text-xs text-slate-500">{label}</div>
		<div className="text-lg font-semibold text-slate-900">{value}</div>
	</div>
);

const Table = ({ title, columns, rows, currency }) => {
	if (!rows?.length) return null;
	return (
		<div className="mt-5">
			<h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
			<div className="overflow-hidden rounded-lg border border-slate-200">
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-xs text-slate-500">
						<tr>
							{columns.map((c) => (
								<th key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{rows.map((r, i) => (
							<tr key={i}>
								{columns.map((c) => (
									<td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : "text-slate-700"}`}>
										{c.fmt ? c.fmt(r[c.key], r) : r[c.key]}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

const SaleReport = () => {
	const { id } = useParams();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(null); // 'pdf' | 'email'

	const load = useCallback(() => {
		setLoading(true);
		get(`/sales/${id}/report`)
			.then((res) => setData(res.data))
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	}, [id]);

	useEffect(load, [load]);

	const downloadPdf = async () => {
		setBusy("pdf");
		try {
			const res = await fetch(`${API_BASE_URL}/sales/${id}/report.pdf`, { headers: { authorization: getToken() } });
			if (!res.ok) throw new Error("failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `report-${(data?.sale?.name || "event").replace(/[^\w.-]+/g, "_")}.pdf`;
			document.body.appendChild(a); a.click(); a.remove();
			URL.revokeObjectURL(url);
		} catch {
			showToast("error", strings("page.sale.report.failed"));
		} finally { setBusy(null); }
	};

	const emailReport = () => {
		setBusy("email");
		post(`/sales/${id}/report/email`)
			.then((res) => showToast("success", strings("page.sale.report.emailed").replace("$1", res.data?.to || "")))
			.catch(() => showToast("error", strings("page.sale.report.failed")))
			.finally(() => setBusy(null));
	};

	if (loading) return <p className="text-sm text-slate-500">{strings("loading")}</p>;
	if (!data) return <p className="text-sm text-slate-500">{strings("page.sale.report.empty")}</p>;

	const { currency, totals: t } = data;

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-slate-900">{strings("page.sale.report.title")}</h2>
					<p className="text-xs text-slate-500">
						{strings("page.sale.report.generated")}: {new Date(data.generatedAt).toLocaleString()}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button type="button" onClick={load} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
						<i className="fa-solid fa-rotate" aria-hidden /> {strings("page.sale.report.refresh")}
					</button>
					<button type="button" onClick={downloadPdf} disabled={busy === "pdf"} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
						<i className={`fa-solid ${busy === "pdf" ? "fa-spinner fa-spin" : "fa-file-pdf"}`} aria-hidden /> {strings("page.sale.report.download")}
					</button>
					<button type="button" onClick={emailReport} disabled={busy === "email"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
						<i className={`fa-solid ${busy === "email" ? "fa-spinner fa-spin" : "fa-envelope"}`} aria-hidden /> {strings("page.sale.report.email")}
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				<Tile label={strings("page.sale.report.tickets")} value={t.tickets} />
				<Tile label={strings("page.sale.report.gross")} value={fmtMoney(t.grossCents, currency)} />
				<Tile label={strings("page.sale.report.discounts")} value={fmtMoney(t.discountCents, currency)} />
				<Tile label={strings("page.sale.report.net")} value={fmtMoney(t.netCents, currency)} />
				<Tile label={strings("page.sale.report.refunded")} value={`${t.refundedCount} / ${fmtMoney(t.refundedCents, currency)}`} />
				<Tile label={strings("page.sale.report.scanned")} value={t.scanned} />
			</div>

			<Table title={strings("page.sale.report.ticketTypes")} currency={currency} rows={data.products} columns={[
				{ key: "name", label: strings("page.sale.report.type") },
				{ key: "tickets", label: strings("page.sale.report.sold"), align: "right" },
				{ key: "grossCents", label: strings("page.sale.report.gross"), align: "right", fmt: (v) => fmtMoney(v, currency) },
				{ key: "discountCents", label: strings("page.sale.report.discounts"), align: "right", fmt: (v) => fmtMoney(v, currency) },
				{ key: "netCents", label: strings("page.sale.report.net"), align: "right", fmt: (v) => fmtMoney(v, currency) },
			]} />

			<Table title={strings("page.sale.report.channels")} currency={currency} rows={data.channels} columns={[
				{ key: "name", label: strings("page.sale.report.channel") },
				{ key: "tickets", label: strings("page.sale.report.tickets"), align: "right" },
				{ key: "netCents", label: strings("page.sale.report.net"), align: "right", fmt: (v) => fmtMoney(v, currency) },
			]} />

			<Table title={strings("page.sale.report.promotions")} currency={currency} rows={data.coupons} columns={[
				{ key: "code", label: strings("page.sale.report.code") },
				{ key: "redemptions", label: strings("page.sale.report.redemptions"), align: "right" },
				{ key: "tickets", label: strings("page.sale.report.tickets"), align: "right" },
				{ key: "discountCents", label: strings("page.sale.report.discountGiven"), align: "right", fmt: (v) => fmtMoney(v, currency) },
			]} />

			<Table title={strings("page.sale.report.payments")} currency={currency} rows={data.payments} columns={[
				{ key: "method", label: strings("page.sale.report.method"), fmt: (v) => PAY_LABEL[v] || v },
				{ key: "count", label: strings("page.sale.report.transactions"), align: "right" },
				{ key: "paidCents", label: strings("page.sale.report.paid"), align: "right", fmt: (v) => fmtMoney(v, currency) },
			]} />
		</div>
	);
};

export default SaleReport;
