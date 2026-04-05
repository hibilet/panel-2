import dayjs from "dayjs";
import strings, { formatCurrency } from "../../../../localization";

const statusStyles = {
	pending: "bg-amber-100 text-amber-800",
	paid: "bg-emerald-100 text-emerald-800",
	draft: "bg-slate-100 text-slate-600",
	cancelled: "bg-red-100 text-red-800",
};

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "—");

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

const InvoicePanel = ({ invoice, onClose }) => {
	if (!invoice) return null;

	const bd = invoice.breakdown ?? {};
	const period = invoice.period ?? {};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<div>
					<h2 className="text-lg font-semibold text-slate-900">
						{typeof invoice.owner === "string" ? invoice.owner.slice(0, 8) : invoice.owner?.name ?? invoice.billing?.corporateName ?? "Invoice"}
					</h2>
					{period.start && (
						<p className="text-sm text-slate-500">
							{formatDate(period.start)} — {formatDate(period.end)}
						</p>
					)}
				</div>
				<div className="flex items-center gap-3">
					{invoice.status && (
						<span
							className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[invoice.status] ?? "bg-slate-100 text-slate-600"}`}
						>
							{invoice.status}
						</span>
					)}
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label={strings("common.ariaClose")}
					>
						<i className="fa-solid fa-xmark text-lg" aria-hidden />
					</button>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
				{/* Tier + period info */}
				{invoice.tier && (
					<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
							{strings("page.invoices.tier")}
						</p>
						<p className="font-medium text-slate-900">
							{invoice.tier?.name ?? invoice.tier}
						</p>
					</div>
				)}

				{/* Breakdown */}
				<div>
					<p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
						{strings("page.invoices.breakdown")}
					</p>
					<div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
						<div className="px-4">
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
				</div>

				{/* Totals */}
				<div className="rounded-lg border border-slate-200 divide-y divide-slate-100 px-4">
					<Row
						label={strings("page.invoices.subtotal")}
						value={formatCurrency(invoice.subtotal ?? 0)}
					/>
					{(invoice.tax ?? 0) > 0 && (
						<Row
							label={strings("page.invoices.tax")}
							value={formatCurrency((invoice.subtotal ?? 0) * ((invoice.tax ?? 0) - 1))}
						/>
					)}
					<Row
						label={strings("page.invoices.total")}
						value={formatCurrency((invoice.subtotal ?? 0) + ((invoice.subtotal ?? 0) * ((invoice.tax ?? 0) -1)))}
						bold
					/>
				</div>
			</div>
		</div>
	);
};

export default InvoicePanel;
