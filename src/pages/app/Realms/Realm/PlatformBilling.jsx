import { useEffect, useState } from "react";

import { get, post, put } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";

// Superadmin-only: what the PLATFORM operator charges THIS realm - the second
// billing layer, above realm -> merchant. Fixed + per-ticket + % of net, any
// combination. commissionRate is stored as a decimal (0.01) but shown as a
// percent (1) so the operator types "1" for 1%.
const toPercent = (rate) => (rate ? Math.round(rate * 1000) / 10 : 0);
const toRate = (percent) => (Number(percent) || 0) / 100;

const PlatformBilling = ({ realmId, platform }) => {
	const [pricing, setPricing] = useState({
		baseFee: platform?.pricing?.baseFee ?? 0,
		perTicketFee: platform?.pricing?.perTicketFee ?? 0,
		commissionPct: toPercent(platform?.pricing?.commissionRate ?? 0),
		currency: platform?.pricing?.currency ?? "eur",
	});
	const [active, setActive] = useState(platform?.status === "active");
	const [saving, setSaving] = useState(false);
	const [issuing, setIssuing] = useState(false);
	const [error, setError] = useState(null);
	const [invoices, setInvoices] = useState([]);

	const loadInvoices = () => {
		get(`/realms/${realmId}/invoices`)
			.then((res) => setInvoices(res.data ?? []))
			.catch(() => setInvoices([]));
	};

	useEffect(() => {
		if (realmId) loadInvoices();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [realmId]);

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			await put(`/realms/${realmId}/platform`, {
				pricing: {
					baseFee: Number(pricing.baseFee) || 0,
					perTicketFee: Number(pricing.perTicketFee) || 0,
					commissionRate: toRate(pricing.commissionPct),
					currency: pricing.currency || "eur",
				},
				status: active ? "active" : "inactive",
			});
		} catch (err) {
			setError(err?.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	};

	const issueNow = async () => {
		setIssuing(true);
		setError(null);
		try {
			await post(`/realms/${realmId}/invoices`, {});
			loadInvoices();
		} catch (err) {
			setError(err?.message ?? "Could not issue invoice");
		} finally {
			setIssuing(false);
		}
	};

	const cur = (pricing.currency || "eur").toUpperCase();

	return (
		<div className="rounded-lg border border-slate-200 p-4">
			<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
				<i className="fa-solid fa-file-invoice-dollar text-slate-500" aria-hidden />
				Platform billing
			</div>
			<p className="mb-3 text-xs text-slate-500">
				What the platform charges this realm for its whole ticket volume. Any
				combination: a fixed fee per period, a flat fee per sold ticket, and a
				percentage of net sales.
			</p>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<label className="text-xs font-medium text-slate-600">
					Base fee ({cur})
					<input
						type="number"
						step="0.01"
						min="0"
						value={pricing.baseFee}
						onChange={(e) => setPricing((p) => ({ ...p, baseFee: e.target.value }))}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</label>
				<label className="text-xs font-medium text-slate-600">
					Per ticket ({cur})
					<input
						type="number"
						step="0.01"
						min="0"
						value={pricing.perTicketFee}
						onChange={(e) => setPricing((p) => ({ ...p, perTicketFee: e.target.value }))}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</label>
				<label className="text-xs font-medium text-slate-600">
					Commission (%)
					<input
						type="number"
						step="0.1"
						min="0"
						value={pricing.commissionPct}
						onChange={(e) => setPricing((p) => ({ ...p, commissionPct: e.target.value }))}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
					/>
				</label>
			</div>

			<div className="mt-3 flex items-center justify-between gap-3">
				<label className="inline-flex items-center gap-2 text-sm text-slate-700">
					<input
						type="checkbox"
						checked={active}
						onChange={(e) => setActive(e.target.checked)}
						className="h-4 w-4 rounded border-slate-300"
					/>
					Billing active (invoices issue on the 1st of each month)
				</label>
				<button
					type="button"
					onClick={save}
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
				>
					{saving ? "Saving…" : "Save pricing"}
				</button>
			</div>

			{error && <p className="mt-2 text-xs text-red-600">{error}</p>}

			<div className="mt-4 border-t border-slate-200 pt-3">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-sm font-semibold text-slate-700">{strings("page.invoices.title")}</span>
					<button
						type="button"
						onClick={issueNow}
						disabled={issuing}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{issuing ? strings("page.platformBilling.issuing") : strings("page.platformBilling.issueNow")}
					</button>
				</div>

				{invoices.length === 0 ? (
					<p className="text-xs text-slate-500">{strings("page.platformBilling.empty")}</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="text-xs text-slate-500">
									<th className="py-1 pr-3">{strings("page.platformBilling.col.number")}</th>
									<th className="py-1 pr-3">{strings("page.platformBilling.col.period")}</th>
									<th className="py-1 pr-3">{strings("page.platformBilling.col.tickets")}</th>
									<th className="py-1 pr-3">{strings("page.platformBilling.col.total")}</th>
									<th className="py-1 pr-3">{strings("common.status")}</th>
								</tr>
							</thead>
							<tbody>
								{invoices.map((inv) => (
									<tr key={inv._id} className="border-t border-slate-100">
										<td className="py-1.5 pr-3 font-mono text-xs">{inv.number ?? "—"}</td>
										<td className="py-1.5 pr-3 text-xs text-slate-600">
											{inv.period?.start && inv.period?.end
												? `${new Date(inv.period.start).toLocaleDateString()} – ${new Date(inv.period.end).toLocaleDateString()}`
												: "—"}
										</td>
										<td className="py-1.5 pr-3">{inv.breakdown?.salesCount ?? 0}</td>
										<td className="py-1.5 pr-3">
											{formatCurrency(inv.total ?? inv.subtotal ?? 0, inv.currency)}
										</td>
										<td className="py-1.5 pr-3">
											<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
												{inv.status}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default PlatformBilling;
