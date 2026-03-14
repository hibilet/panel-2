import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import strings, { formatCurrency } from "../../localization";

const mergeWithCompareData = (data = [], compareData = []) => {
	if (!compareData?.length) return data;
	const byDay = Object.fromEntries(compareData.map((d) => [d.date, d.daily]));
	return data.map((row) => ({
		...row,
		currentDaily: byDay[row.date] ?? null,
	}));
};

const buildChartDataFromApi = (apiData = [], year, month) => {
	const daysInMonth = dayjs().year(year).month(month).daysInMonth();
	const byDate = Object.fromEntries((apiData ?? []).map((d) => [d.date, d]));
	const data = [];
	const monthName = dayjs().month(month).format("MMM");
	for (let day = 1; day <= daysInMonth; day++) {
		const dateStr = dayjs()
			.year(year)
			.month(month)
			.date(day)
			.format("YYYY-MM-DD");
		const dayData = byDate[dateStr];
		const daily = dayData ? dayData.total : 0;
		data.push({
			date: `${day}`,
			label: `${day} ${monthName}`,
			daily,
		});
	}
	return data;
};

const MONTH_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
	value: i,
	label:
		i === 0
			? strings("dashboard.monthThis")
			: i === 1
				? strings("dashboard.monthAgo")
				: strings("dashboard.monthsAgo", [i]),
}));

const useChartColors = () => {
	const [themeVersion, setThemeVersion] = useState(0);
	useEffect(() => {
		const onThemeChange = () => setThemeVersion((v) => v + 1);
		window.addEventListener("themechange", onThemeChange);
		return () => window.removeEventListener("themechange", onThemeChange);
	}, []);
	return useMemo(() => {
		const isDark = document.documentElement.classList.contains("dark");
		void themeVersion;
		return {
			grid: isDark ? "#334155" : "#e2e8f0",
			tick: isDark ? "#94a3b8" : "#64748b",
			line: isDark ? "#e2e8f0" : "#0f172a",
			compareLine: isDark ? "#38bdf8" : "#0ea5e9",
			tooltipBg: isDark ? "#1e293b" : "white",
			tooltipBorder: isDark ? "#334155" : "#e2e8f0",
		};
	}, [themeVersion]);
};

const SalesChart = ({
	data: dataProp,
	compareData = null,
	loading = false,
	sales = [],
	selectedSale = "all",
	onSaleChange,
	selectedMonthOffset = 0,
	onMonthOffsetChange,
}) => {
	const colors = useChartColors();
	const chartMonth = dayjs().subtract(selectedMonthOffset, "month");
	const rawData =
		dataProp ??
		buildChartDataFromApi([], chartMonth.year(), chartMonth.month());
	const data = mergeWithCompareData(rawData, compareData);
	const hasCompare = compareData?.length > 0;
	const monthName = chartMonth.format("MMMM");
	const year = chartMonth.year();

	const hasData = !loading && data?.length > 0;
	const dropdownsDisabled = !hasData;

	return (
		<section
			aria-labelledby="sales-chart-heading"
			className="mb-8"
			data-tour="dashboard-sales-chart"
		>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2
					id="sales-chart-heading"
					className="text-lg font-medium text-slate-900"
				>
					{strings("dashboard.salesChart", [monthName, year])}
				</h2>
				<div className="flex flex-wrap items-center gap-3">
					<select
						value={selectedMonthOffset}
						onChange={(e) => onMonthOffsetChange?.(Number(e.target.value))}
						disabled={dropdownsDisabled}
						className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={strings("common.selectMonth")}
					>
						{MONTH_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>
					<select
						value={selectedSale}
						onChange={(e) => onSaleChange?.(e.target.value)}
						disabled={dropdownsDisabled}
						className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={strings("common.filterBySale")}
					>
						<option value="all">{strings("common.allSales")}</option>
						{sales.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				{loading ? (
					<div className="flex h-64 flex-col gap-4 sm:h-80">
						<div className="h-4 w-40 animate-shimmer rounded" />
						<div className="min-h-[200px] flex-1 animate-shimmer rounded" />
					</div>
				) : (
					<div className="h-64 min-h-[256px] w-full sm:h-80">
						<ResponsiveContainer width="100%" height="100%" minHeight={256}>
							<LineChart
								data={data}
								margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
								<XAxis
									dataKey="label"
									tick={{ fontSize: 12, fill: colors.tick }}
									tickLine={{ stroke: colors.grid }}
									axisLine={{ stroke: colors.grid }}
								/>
								<YAxis
									tickFormatter={(v) => formatCurrency(v)}
									tick={{ fontSize: 12, fill: colors.tick }}
									tickLine={{ stroke: colors.grid }}
									axisLine={{ stroke: colors.grid }}
								/>
								<Tooltip
									formatter={(value, name) => [formatCurrency(value), name]}
									labelFormatter={(label, payload) =>
										payload?.[0]?.payload?.label ?? label
									}
									contentStyle={{
										backgroundColor: colors.tooltipBg,
										border: `1px solid ${colors.tooltipBorder}`,
										borderRadius: "8px",
										boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
									}}
								/>
								{hasCompare && (
									<Legend
										wrapperStyle={{ fontSize: 12 }}
										iconType="line"
										iconSize={10}
									/>
								)}
								<Line
									type="monotone"
									dataKey="daily"
									name={strings("dashboard.salesChartSelectedMonth")}
									stroke={colors.line}
									strokeWidth={2}
									dot={{ fill: colors.line, strokeWidth: 0, r: 3 }}
									activeDot={{
										r: 5,
										fill: colors.line,
										stroke: colors.tooltipBg,
										strokeWidth: 2,
									}}
								/>
								{hasCompare && (
									<Line
										type="monotone"
										dataKey="currentDaily"
										name={strings("dashboard.salesChartThisMonth")}
										stroke={colors.compareLine}
										strokeWidth={2}
										strokeDasharray="5 5"
										dot={{ fill: colors.compareLine, strokeWidth: 0, r: 3 }}
										activeDot={{
											r: 5,
											fill: colors.compareLine,
											stroke: colors.tooltipBg,
											strokeWidth: 2,
										}}
										connectNulls
									/>
								)}
							</LineChart>
						</ResponsiveContainer>
					</div>
				)}
			</div>
		</section>
	);
};

export default SalesChart;
