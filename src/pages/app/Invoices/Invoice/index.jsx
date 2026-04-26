import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import VatBadge from "../../../../components/invoices/VatBadge";
import { useApp } from "../../../../context";
import { API_BASE_URL, del, get, patch, post } from "../../../../lib/client";
import { getToken } from "../../../../lib/storage";
import strings, { formatCurrency } from "../../../../localization";

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	draft: "bg-slate-100 text-slate-600",
	cancelled: "bg-red-100 text-red-800",
	failed: "bg-red-100 text-red-800",
};

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "-");
const formatDateTime = (d) => (d ? dayjs(d).format("D MMM YYYY, HH:mm") : "-");

const Row = ({ label, value, bold }) => (
	<div className="flex items-center justify-between py-2">
		<span
			className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-500"}`}
		>
			{label}
		</span>
		<span
			className={`text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-900"}`}
		>
			{value}
		</span>
	</div>
);

const formatAddress = (addr) => {
	if (!addr) return null;
	if (typeof addr === "string") return addr;
	return [addr.street, addr.zip, addr.city, addr.country]
		.filter(Boolean)
		.join(", ");
};

const Party = ({ title, name, vatId, registry, address, email }) => (
	<div className="rounded-lg border border-slate-200 p-4">
		<p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
			{title}
		</p>
		<p className="font-medium text-slate-900">{name || "-"}</p>
		{address && <p className="mt-1 text-sm text-slate-600">{address}</p>}
		{vatId && (
			<p className="mt-1 text-xs text-slate-500">
				{strings("page.invoices.vatId")}:{" "}
				<span className="font-mono">{vatId}</span>
			</p>
		)}
		{registry && (
			<p className="text-xs text-slate-500">
				{strings("page.invoices.registry")}:{" "}
				<span className="font-mono">{registry}</span>
			</p>
		)}
		{email && <p className="text-xs text-slate-500">{email}</p>}
	</div>
);

const Invoice = () => {
	const { id } = useParams();
	const { account } = useApp();
	const isAdmin = account?.type === "account.admin";
	const [invoice, setInvoice] = useState(null);
	const [fetchedId, setFetchedId] = useState(null);
	const [error, setError] = useState(null);
	const [syncing, setSyncing] = useState(false);
	const [adding, setAdding] = useState(false);
	const [addForm, setAddForm] = useState({ description: "", qty: 1, unitAmount: 0 });
	const loading = fetchedId !== id;
	const canEdit = isAdmin && invoice && !invoice.stripeInvoiceId
		&& (invoice.status === "draft" || invoice.status === "pending");

	const onAddItem = async () => {
		if (!addForm.description) return;
		setAdding(true);
		try {
			const res = await post(`/invoices/${id}/line-items`, {
				description: addForm.description,
				qty: Number(addForm.qty) || 1,
				unitAmount: Number(addForm.unitAmount) || 0,
			});
			if (res?.data) setInvoice(res.data);
			setAddForm({ description: "", qty: 1, unitAmount: 0 });
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setAdding(false);
		}
	};
	const onRemoveItem = async (itemId) => {
		try {
			const res = await del(`/invoices/${id}/line-items/${itemId}`);
			if (res?.data) setInvoice(res.data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedDelete"));
		}
	};
	const onPatchItem = async (itemId, body) => {
		try {
			const res = await patch(`/invoices/${id}/line-items/${itemId}`, body);
			if (res?.data) setInvoice(res.data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		}
	};
	const onFinalize = async () => {
		try {
			const res = await post(`/invoices/${id}/finalize`, {});
			if (res?.data) setInvoice(res.data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		}
	};

	const onSync = async () => {
		if (!id) return;
		setSyncing(true);
		try {
			const res = await post(`/invoices/${id}/sync`, {});
			if (res?.data) setInvoice(res.data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoadInvoices"));
		} finally {
			setSyncing(false);
		}
	};

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

	const vat =
		invoice?.vat?.amount != null
			? invoice.vat
			: { rate: 0, amount: invoice?.tax || 0, mode: "legacy", note: "" };
	const total = invoice?.total ?? (invoice?.subtotal ?? 0) + (vat.amount ?? 0);

	const seller = invoice?.sellerSnapshot ?? {};
	const buyer = invoice?.buyerSnapshot ?? {};
	const sellerName = seller.legalName || seller.tradeName;
	const buyerName = buyer?.corporate?.name || buyer?.name;

	const printUrl = invoice?.id
		? `${API_BASE_URL}/invoices/${invoice.id}/print?token=${encodeURIComponent(getToken() ?? "")}`
		: null;

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
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			{loading ? (
				<div className="flex justify-center py-12">
					<i
						className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
						aria-hidden
					/>
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
								<i
									className="fa-solid fa-file-invoice-dollar text-slate-600"
									aria-hidden
								/>
								{invoice.number ?? strings("page.invoices.title")}
							</h1>
							{period.start && (
								<p className="mt-1 text-sm text-slate-500">
									{formatDate(period.start)} - {formatDate(period.end)}
								</p>
							)}
							{invoice.kind && (
								<p className="mt-0.5 text-xs text-slate-400">
									{strings(`page.invoices.kind.${invoice.kind}`)}
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
							<VatBadge vat={vat} />
						</div>
					</header>

					<div className="space-y-6 px-6 py-5">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Party
								title={strings("page.invoices.from")}
								name={sellerName}
								vatId={seller.vatId}
								registry={seller.registry}
								address={formatAddress(seller.address)}
								email={seller.email}
							/>
							<Party
								title={strings("page.invoices.to")}
								name={buyerName}
								vatId={buyer?.corporate?.tax}
								registry={buyer?.corporate?.registry}
								address={formatAddress(buyer?.address)}
								email={buyer?.email}
							/>
						</div>

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
								{strings("page.invoices.lineItems")}
							</p>
							{(invoice.lineItems || []).filter((li) => !li.removedAt).length === 0 ? (
								<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
									{strings("page.invoices.noLineItems")}
								</div>
							) : (
								<div className="overflow-hidden rounded-lg border border-slate-200">
									<table className="w-full text-sm">
										<thead className="bg-slate-50 text-xs uppercase text-slate-500">
											<tr>
												<th className="px-3 py-2 text-left">{strings("page.invoices.description")}</th>
												<th className="px-3 py-2 text-right">Qty</th>
												<th className="px-3 py-2 text-right">{strings("page.invoices.unit")}</th>
												<th className="px-3 py-2 text-right">{strings("page.invoices.amount")}</th>
												{canEdit && <th className="px-3 py-2"></th>}
											</tr>
										</thead>
										<tbody>
											{(invoice.lineItems || []).filter((li) => !li.removedAt).map((li) => (
												<tr key={li._id || li.id} className="border-t border-slate-100">
													<td className="px-3 py-2">
														{canEdit && li.removable ? (
															<input
																type="text"
																defaultValue={li.description}
																onBlur={(e) => e.target.value !== li.description && onPatchItem(li._id || li.id, { description: e.target.value })}
																className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
															/>
														) : (
															<span>{li.description}</span>
														)}
														<span className="ml-2 text-xs text-slate-400">{li.code}</span>
													</td>
													<td className="px-3 py-2 text-right">
														{canEdit && li.removable ? (
															<input
																type="number"
																min="0"
																defaultValue={li.qty}
																onBlur={(e) => Number(e.target.value) !== li.qty && onPatchItem(li._id || li.id, { qty: Number(e.target.value) })}
																className="w-16 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
															/>
														) : li.qty}
													</td>
													<td className="px-3 py-2 text-right">
														{canEdit && li.removable ? (
															<input
																type="number"
																step="0.01"
																defaultValue={li.unitAmount}
																onBlur={(e) => Number(e.target.value) !== li.unitAmount && onPatchItem(li._id || li.id, { unitAmount: Number(e.target.value) })}
																className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
															/>
														) : formatCurrency(li.unitAmount)}
													</td>
													<td className="px-3 py-2 text-right font-medium">{formatCurrency(li.amount)}</td>
													{canEdit && (
														<td className="px-3 py-2 text-right">
															{li.removable ? (
																<button
																	type="button"
																	onClick={() => onRemoveItem(li._id || li.id)}
																	className="text-slate-400 hover:text-red-600"
																	title={strings("common.remove")}
																>
																	<i className="fa-solid fa-trash" aria-hidden />
																</button>
															) : (
																<i className="fa-solid fa-lock text-slate-300" aria-hidden title={strings("page.invoices.locked")} />
															)}
														</td>
													)}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
							{canEdit && (
								<div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
									<input
										type="text"
										value={addForm.description}
										onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
										placeholder={strings("page.invoices.addItemDesc")}
										className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
									/>
									<input
										type="number"
										min="0"
										value={addForm.qty}
										onChange={(e) => setAddForm({ ...addForm, qty: e.target.value })}
										className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
									/>
									<input
										type="number"
										step="0.01"
										value={addForm.unitAmount}
										onChange={(e) => setAddForm({ ...addForm, unitAmount: e.target.value })}
										className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
										placeholder="€"
									/>
									<button
										type="button"
										onClick={onAddItem}
										disabled={adding || !addForm.description}
										className="rounded-md border border-transparent bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
									>
										<i className={`fa-solid ${adding ? "fa-spinner fa-spin" : "fa-plus"} mr-1`} aria-hidden />
										{strings("page.invoices.addItem")}
									</button>
								</div>
							)}
							{isAdmin && invoice.stripeInvoiceId && (
								<div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
									<i className="fa-solid fa-lock mr-1.5" aria-hidden />
									{strings("page.invoices.stripeLocked")}
								</div>
							)}
						</div>

						<div className="rounded-lg border border-slate-200 px-4">
							<Row
								label={strings("page.invoices.subtotal")}
								value={formatCurrency(invoice.subtotal ?? 0)}
							/>
							<Row
								label={
									vat.rate
										? `${strings("common.vat")} ${Math.round(vat.rate * 100)}%`
										: strings("common.vat")
								}
								value={formatCurrency(vat.amount ?? 0)}
							/>
							<Row
								label={strings("page.invoices.total")}
								value={formatCurrency(total)}
								bold
							/>
						</div>

						{vat.note && (
							<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
								<i
									className="fa-solid fa-circle-info mr-1.5 text-slate-500"
									aria-hidden
								/>
								{vat.note}
							</div>
						)}

						{invoice.status === "paid" && invoice.paidAt && (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
								<i className="fa-solid fa-circle-check mr-1.5" aria-hidden />
								{strings("page.invoices.paidOn", [
									formatDateTime(invoice.paidAt),
								])}
							</div>
						)}

						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{isAdmin && invoice.status === "draft" && (
								<button
									type="button"
									onClick={onFinalize}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
								>
									<i className="fa-solid fa-paper-plane" aria-hidden />
									{strings("page.invoices.finalize")}
								</button>
							)}
							{canPay && (
								<a
									href={payUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
								>
									<i className="fa-solid fa-credit-card" aria-hidden />
									{strings("page.invoices.payNow")}
								</a>
							)}
							{printUrl && (
								<a
									href={printUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
								>
									<i className="fa-solid fa-print" aria-hidden />
									{strings("page.invoices.print")}
								</a>
							)}
							{!canPay && payUrl && (
								<a
									href={payUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
								>
									<i className="fa-solid fa-up-right-from-square" aria-hidden />
									{strings("page.invoices.viewOnStripe")}
								</a>
							)}
							{invoice.stripeInvoiceId && (
								<button
									type="button"
									onClick={onSync}
									disabled={syncing}
									className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
									title={strings("page.invoices.syncHint")}
								>
									<i
										className={`fa-solid ${syncing ? "fa-spinner fa-spin" : "fa-rotate"}`}
										aria-hidden
									/>
									{strings("page.invoices.sync")}
								</button>
							)}
						</div>

						{invoice.stripePushError && (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
								<i
									className="fa-solid fa-triangle-exclamation mr-1.5"
									aria-hidden
								/>
								Stripe push error: {invoice.stripePushError}
							</div>
						)}

						<div className="rounded-lg border border-slate-200 px-4 text-xs">
							<Row
								label={strings("detail.id")}
								value={
									<span className="font-mono text-slate-500">{invoice.id}</span>
								}
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
