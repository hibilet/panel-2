import {
	Area,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import strings, { formatCurrency } from "../../../../../localization";
import { buildSalesVsChurn, normalizeDate } from "./churn-utils.js";

/**
 * Cross-comparison chart: sales (positive area) vs. churn (negative area)
 * over the report window. Net line crosses zero when churn outpaces sales.
 *
 *   salesByDay: Map<YYYY-MM-DD, number>
 *   churnByDay: Map<YYYY-MM-DD, number>
 */
export const collectSalesByDay = (rawSalesData) => {
	const map = new Map();
	for (const r of rawSalesData ?? []) {
		const key = r?.day ?? null;
		if (!key) continue;
		map.set(key, (map.get(key) ?? 0) + (Number(r.count) || 0));
	}
	return map;
};

/**
 * Sums abandoned RESERVATIONS (tickets) per day, not baskets. The sales side
 * counts reservations purchased; counting the churn side in tickets makes
 * the comparison apples-to-apples - one abandoned basket of 4 tickets
 * contributes 4, not 1.
 */
export const collectChurnByDay = (entries) => {
	const map = new Map();
	for (const e of entries ?? []) {
		for (const fb of e.failedBaskets ?? []) {
			const at = normalizeDate(fb?.createdAt);
			if (!at) continue;
			const items = Array.isArray(fb?.reservations) ? fb.reservations.length : 0;
			if (items === 0) continue;
			const key = at.format("YYYY-MM-DD");
			map.set(key, (map.get(key) ?? 0) + items);
		}
	}
	return map;
};

const SalesVsChurnChart = ({ entries, salesByDay, start, end }) => {
	const churnByDay = collectChurnByDay(entries);
	const data = buildSalesVsChurn(
		salesByDay ?? new Map(),
		churnByDay,
		start,
		end,
	);

	if (data.length === 0) return null;

	const totalSales = data.reduce((s, d) => s + d.sales, 0);
	const totalChurn = data.reduce((s, d) => s + d.churn, 0);
	const totalNet = totalSales - totalChurn;

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="text-sm font-medium text-slate-700">
					{strings("page.reports.churn.compare.title")}
				</h3>
				<div className="flex flex-wrap gap-3 text-xs text-slate-600">
					<span>
						<span
							className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500"
							aria-hidden
						/>
						{strings("page.reports.churn.compare.sales")}:{" "}
						<strong className="text-slate-900">{totalSales}</strong>
					</span>
					<span>
						<span
							className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500"
							aria-hidden
						/>
						{strings("page.reports.churn.compare.churn")}:{" "}
						<strong className="text-slate-900">{totalChurn}</strong>
					</span>
					<span>
						<span
							className={`mr-1 inline-block h-2 w-2 rounded-full ${totalNet >= 0 ? "bg-slate-900" : "bg-red-700"}`}
							aria-hidden
						/>
						{strings("page.reports.churn.compare.net")}:{" "}
						<strong
							className={totalNet >= 0 ? "text-slate-900" : "text-red-700"}
						>
							{totalNet}
						</strong>
					</span>
				</div>
			</div>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={data}
						margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
					>
						<defs>
							<linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
								<stop offset="100%" stopColor="#10b981" stopOpacity={0} />
							</linearGradient>
							<linearGradient id="churnGradient" x1="0" y1="1" x2="0" y2="0">
								<stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
								<stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 10, fill: "#64748b" }}
							interval="preserveStartEnd"
							minTickGap={32}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: "#64748b" }}
							allowDecimals={false}
						/>
						<ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
						<Tooltip
							formatter={(value, key) => {
								if (key === "churnNegative")
									return [
										Math.abs(value),
										strings("page.reports.churn.compare.churn"),
									];
								if (key === "sales")
									return [value, strings("page.reports.churn.compare.sales")];
								if (key === "net")
									return [value, strings("page.reports.churn.compare.net")];
								return [value, key];
							}}
							contentStyle={{
								backgroundColor: "white",
								border: "1px solid #e2e8f0",
								borderRadius: "8px",
								fontSize: "12px",
							}}
						/>
						<Legend
							wrapperStyle={{ fontSize: 11 }}
							iconType="circle"
							iconSize={8}
						/>
						<Area
							type="monotone"
							dataKey="sales"
							name={strings("page.reports.churn.compare.sales")}
							stroke="#10b981"
							strokeWidth={2}
							fill="url(#salesGradient)"
						/>
						<Area
							type="monotone"
							dataKey="churnNegative"
							name={strings("page.reports.churn.compare.churn")}
							stroke="#ef4444"
							strokeWidth={2}
							fill="url(#churnGradient)"
						/>
						<Line
							type="monotone"
							dataKey="net"
							name={strings("page.reports.churn.compare.net")}
							stroke="#0f172a"
							strokeWidth={2}
							dot={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default SalesVsChurnChart;
export { formatCurrency };
