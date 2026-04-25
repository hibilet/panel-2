import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { StatCard } from "../../../../components/shared";
import strings from "../../../../localization";

const CHANNEL_COLORS = [
	"#0f172a",
	"#0ea5e9",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#14b8a6",
	"#f97316",
];

const padHour = (h) => String(h).padStart(2, "0");

const sumCount = (rows) =>
	(rows ?? []).reduce((s, r) => s + (Number(r?.count) || 0), 0);

const aggregateByBucket = (rows, bucketKey) => {
	const map = new Map();
	for (const r of rows ?? []) {
		const raw = r?.[bucketKey];
		if (raw == null) continue;
		const key = bucketKey === "hour" ? padHour(raw) : String(raw);
		map.set(key, (map.get(key) ?? 0) + (Number(r?.count) || 0));
	}
	return map;
};

const buildHourlyChart = (raw, leads) => {
	const rawByHour = aggregateByBucket(raw, "hour");
	const leadsByHour = aggregateByBucket(leads, "hour");
	return Array.from({ length: 24 }, (_, h) => {
		const key = padHour(h);
		return {
			label: `${key}:00`,
			key,
			reservations: rawByHour.get(key) ?? 0,
			leads: leadsByHour.get(key) ?? 0,
		};
	});
};

const buildDailyChart = (raw, leads, start, end) => {
	const rawByDay = aggregateByBucket(raw, "day");
	const leadsByDay = aggregateByBucket(leads, "day");
	const startDate = start ? dayjs(start) : null;
	const endDate = end ? dayjs(end) : null;
	if (!startDate?.isValid() || !endDate?.isValid()) {
		const allKeys = Array.from(
			new Set([...(rawByDay.keys() ?? []), ...(leadsByDay.keys() ?? [])]),
		).sort();
		return allKeys.map((key) => ({
			label: dayjs(key).format("D MMM"),
			key,
			reservations: rawByDay.get(key) ?? 0,
			leads: leadsByDay.get(key) ?? 0,
		}));
	}
	const days = [];
	let cur = startDate.startOf("day");
	const last = endDate.startOf("day");
	while (cur.isBefore(last) || cur.isSame(last, "day")) {
		const key = cur.format("YYYY-MM-DD");
		days.push({
			label: cur.format("D MMM"),
			key,
			reservations: rawByDay.get(key) ?? 0,
			leads: leadsByDay.get(key) ?? 0,
		});
		cur = cur.add(1, "day");
	}
	return days;
};

const aggregateByChannel = (rows) => {
	const map = new Map();
	for (const r of rows ?? []) {
		const name = r?.name ?? "—";
		map.set(name, (map.get(name) ?? 0) + (Number(r?.count) || 0));
	}
	return Array.from(map.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
};

const SalesReportView = ({ report }) => {
	const [tab, setTab] = useState("overview");

	const period = report?.params?.period ?? "daily";
	const isHourly = period === "daily";
	const raw = report?.raw_data ?? [];
	const leads = report?.leads_data ?? [];

	const chartData = useMemo(
		() =>
			isHourly
				? buildHourlyChart(raw, leads)
				: buildDailyChart(raw, leads, report?.start, report?.end),
		[isHourly, raw, leads, report?.start, report?.end],
	);

	const channels = useMemo(() => aggregateByChannel(raw), [raw]);
	const channelTotal = channels.reduce((s, c) => s + c.count, 0);

	const totalReservations = sumCount(raw);
	const totalLeads = sumCount(leads);
	const nonZeroBuckets = chartData.filter((d) => d.reservations > 0);
	const peak = nonZeroBuckets.reduce(
		(best, cur) => (cur.reservations > (best?.reservations ?? 0) ? cur : best),
		null,
	);
	const avg =
		chartData.length > 0
			? Math.round((totalReservations / chartData.length) * 10) / 10
			: 0;

	const showsLeads = totalLeads > 0 && totalLeads !== totalReservations;

	const periodLabel = strings(`page.reports.sales.period.${period}`);

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					label={strings("page.reports.sales.stats.total")}
					value={totalReservations.toLocaleString()}
				/>
				<StatCard
					label={strings("page.reports.sales.stats.channels")}
					value={channels.length}
				/>
				<StatCard
					label={strings("page.reports.sales.stats.peak")}
					value={
						peak
							? `${peak.label} (${peak.reservations})`
							: "—"
					}
				/>
				<StatCard
					label={
						isHourly
							? strings("page.reports.sales.stats.avgPerHour")
							: strings("page.reports.sales.stats.avgPerDay")
					}
					value={avg.toLocaleString()}
				/>
			</div>

			<div>
				<div className="mb-4 flex gap-1 border-b border-slate-200">
					{[
						{
							key: "overview",
							label: strings("page.reports.sales.tab.overview"),
						},
						{
							key: "channels",
							label: strings("page.reports.sales.tab.byChannel"),
						},
						{
							key: "raw",
							label: strings("page.reports.sales.tab.raw"),
						},
					].map(({ key, label }) => (
						<button
							key={key}
							type="button"
							onClick={() => setTab(key)}
							className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
								tab === key
									? "border-slate-900 text-slate-900"
									: "border-transparent text-slate-500 hover:text-slate-700"
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{tab === "overview" && (
					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<div className="mb-2 flex items-center justify-between">
							<h3 className="text-sm font-medium text-slate-700">
								{isHourly
									? strings("page.reports.sales.chart.byHour")
									: strings("page.reports.sales.chart.byDay")}
							</h3>
							<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
								{periodLabel}
							</span>
						</div>
						{chartData.length === 0 ? (
							<div className="py-12 text-center text-slate-500">
								<i
									className="fa-solid fa-chart-column mb-3 text-4xl text-slate-300"
									aria-hidden
								/>
								<p>{strings("page.reports.sales.chart.empty")}</p>
							</div>
						) : (
							<div className="h-64 w-full sm:h-80">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={chartData}
										margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
										<XAxis
											dataKey="label"
											tick={{ fontSize: 11, fill: "#64748b" }}
											interval={isHourly ? 1 : "preserveStartEnd"}
										/>
										<YAxis
											tick={{ fontSize: 11, fill: "#64748b" }}
											allowDecimals={false}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "white",
												border: "1px solid #e2e8f0",
												borderRadius: "8px",
												fontSize: "12px",
											}}
										/>
										{showsLeads && (
											<Legend
												wrapperStyle={{ fontSize: 12 }}
												iconType="circle"
												iconSize={8}
											/>
										)}
										<Bar
											dataKey="reservations"
											name={strings("page.reports.sales.legendReservations")}
											fill="#0f172a"
											radius={[4, 4, 0, 0]}
										/>
										{showsLeads && (
											<Bar
												dataKey="leads"
												name={strings("page.reports.sales.legendLeads")}
												fill="#0ea5e9"
												radius={[4, 4, 0, 0]}
											/>
										)}
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)}

				{tab === "channels" && (
					<div className="space-y-4">
						{channels.length === 0 ? (
							<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
								{strings("page.reports.sales.byChannel.empty")}
							</div>
						) : (
							<>
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<h3 className="mb-3 text-sm font-medium text-slate-700">
										{strings("page.reports.sales.byChannel.title")}
									</h3>
									<div className="h-64 w-full sm:h-72">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={channels}
												layout="vertical"
												margin={{ top: 5, right: 16, left: 16, bottom: 5 }}
											>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="#e2e8f0"
													horizontal={false}
												/>
												<XAxis
													type="number"
													tick={{ fontSize: 11, fill: "#64748b" }}
													allowDecimals={false}
												/>
												<YAxis
													dataKey="name"
													type="category"
													tick={{ fontSize: 11, fill: "#64748b" }}
													width={140}
												/>
												<Tooltip
													contentStyle={{
														backgroundColor: "white",
														border: "1px solid #e2e8f0",
														borderRadius: "8px",
														fontSize: "12px",
													}}
												/>
												<Bar
													dataKey="count"
													name={strings("page.reports.sales.col.count")}
													radius={[0, 4, 4, 0]}
												>
													{channels.map((entry, i) => (
														<Cell
															key={entry.name}
															fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
														/>
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								</div>

								<div className="overflow-hidden rounded-xl border border-slate-200">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-slate-200 bg-slate-50">
												<th className="px-4 py-3 text-left font-medium text-slate-600">
													{strings("page.reports.sales.col.channel")}
												</th>
												<th className="px-4 py-3 text-right font-medium text-slate-600">
													{strings("page.reports.sales.col.count")}
												</th>
												<th className="px-4 py-3 text-right font-medium text-slate-600">
													{strings("page.reports.sales.col.share")}
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{channels.map((c, i) => {
												const share = channelTotal
													? (c.count / channelTotal) * 100
													: 0;
												return (
													<tr key={c.name} className="hover:bg-slate-50/60">
														<td className="px-4 py-3">
															<span className="inline-flex items-center gap-2">
																<span
																	className="inline-block h-2.5 w-2.5 rounded-sm"
																	style={{
																		backgroundColor:
																			CHANNEL_COLORS[
																				i % CHANNEL_COLORS.length
																			],
																	}}
																	aria-hidden
																/>
																<span className="font-medium text-slate-900">
																	{c.name}
																</span>
															</span>
														</td>
														<td className="px-4 py-3 text-right font-medium text-slate-900">
															{c.count.toLocaleString()}
														</td>
														<td className="px-4 py-3 text-right text-slate-600">
															{share.toFixed(1)}%
															<div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
																<div
																	className="h-1.5 rounded-full"
																	style={{
																		width: `${share}%`,
																		backgroundColor:
																			CHANNEL_COLORS[
																				i % CHANNEL_COLORS.length
																			],
																	}}
																/>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</>
						)}
					</div>
				)}

				{tab === "raw" && (
					<div className="overflow-hidden rounded-xl border border-slate-200">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 bg-slate-50">
									<th className="px-4 py-3 text-left font-medium text-slate-600">
										{strings("page.reports.sales.col.channel")}
									</th>
									<th className="px-4 py-3 text-left font-medium text-slate-600">
										{isHourly
											? strings("page.reports.sales.col.hour")
											: strings("page.reports.sales.col.day")}
									</th>
									<th className="px-4 py-3 text-right font-medium text-slate-600">
										{strings("page.reports.sales.col.count")}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{raw.length === 0 ? (
									<tr>
										<td
											colSpan={3}
											className="px-4 py-8 text-center text-slate-500"
										>
											{strings("page.reports.sales.chart.empty")}
										</td>
									</tr>
								) : (
									raw.map((r, i) => (
										<tr
											key={`${r.name}-${r.hour ?? r.day}-${i}`}
											className="hover:bg-slate-50/60"
										>
											<td className="px-4 py-2.5 text-slate-700">{r.name}</td>
											<td className="px-4 py-2.5 text-slate-700">
												{isHourly
													? `${padHour(r.hour)}:00`
													: dayjs(r.day).format("D MMM YYYY")}
											</td>
											<td className="px-4 py-2.5 text-right font-medium text-slate-900">
												{Number(r.count ?? 0).toLocaleString()}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default SalesReportView;
