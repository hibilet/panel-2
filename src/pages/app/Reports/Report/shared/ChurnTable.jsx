import strings, { formatCurrency } from "../../../../../localization";
import {
	downloadCsv,
	flattenEntries,
	formatDuration,
	SEGMENT_TYPES,
	toCsv,
} from "./churn-utils.js";

const HEADERS = [
	{ key: "email", labelKey: "page.reports.churn.table.email" },
	{ key: "name", labelKey: "page.reports.churn.table.name" },
	{ key: "segment", labelKey: "page.reports.churn.table.segment" },
	{ key: "failedBaskets", labelKey: "page.reports.churn.table.failedBaskets" },
	{ key: "failedRevenue", labelKey: "page.reports.churn.table.failedRevenue" },
	{ key: "avgSessionSeconds", labelKey: "page.reports.churn.table.avgSession" },
	{
		key: "successfulBasketsEver",
		labelKey: "page.reports.churn.table.successCount",
	},
	{
		key: "totalSpendingsEver",
		labelKey: "page.reports.churn.table.lifetimeSpend",
	},
	{ key: "isPaidCustomer", labelKey: "page.reports.churn.table.paid" },
	{ key: "firstFailedAt", labelKey: "page.reports.churn.table.firstFailed" },
	{ key: "lastFailedAt", labelKey: "page.reports.churn.table.lastFailed" },
];

const ChurnTable = ({ entries, filename = "churn-report.csv" }) => {
	const rows = flattenEntries(entries);
	const handleDownload = () => {
		const csv = toCsv(
			rows,
			HEADERS.map((h) => ({ key: h.key, label: strings(h.labelKey) })),
		);
		downloadCsv(filename, csv);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-xs text-slate-500">
					{strings("page.reports.churn.table.rowCount", [String(rows.length)])}
				</p>
				<button
					type="button"
					onClick={handleDownload}
					disabled={rows.length === 0}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<i className="fa-solid fa-file-csv" aria-hidden />
					{strings("page.reports.churn.table.download")}
				</button>
			</div>
			<div className="overflow-x-auto rounded-xl border border-slate-200">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-slate-200 bg-slate-50">
							{HEADERS.map((h) => (
								<th
									key={h.key}
									className="px-3 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap"
								>
									{strings(h.labelKey)}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={HEADERS.length}
									className="px-3 py-8 text-center text-slate-500"
								>
									{strings("page.reports.noLeadsData")}
								</td>
							</tr>
						) : (
							rows.map((row) => {
								const seg = SEGMENT_TYPES[row.segment];
								return (
									<tr key={row.email} className="hover:bg-slate-50/60">
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">
											{row.email}
										</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">
											{row.name}
										</td>
										<td className="px-3 py-2">
											{seg ? (
												<span
													className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${seg.className}`}
												>
													{strings(seg.labelKey)}
												</span>
											) : (
												<span className="text-slate-500">{row.segment}</span>
											)}
										</td>
										<td className="px-3 py-2 text-right font-medium text-slate-900">
											{row.failedBaskets}
										</td>
										<td className="px-3 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
											{formatCurrency(row.failedRevenue)}
										</td>
										<td className="px-3 py-2 text-slate-700 whitespace-nowrap">
											{formatDuration(row.avgSessionSeconds)}
										</td>
										<td className="px-3 py-2 text-right text-slate-700">
											{row.successfulBasketsEver}
										</td>
										<td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">
											{formatCurrency(row.totalSpendingsEver)}
										</td>
										<td className="px-3 py-2 text-slate-700">
											{row.isPaidCustomer ? (
												<i
													className="fa-solid fa-check text-emerald-600"
													aria-hidden
												/>
											) : (
												<i
													className="fa-solid fa-minus text-slate-300"
													aria-hidden
												/>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
											{row.firstFailedAt || "-"}
										</td>
										<td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
											{row.lastFailedAt || "-"}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default ChurnTable;
