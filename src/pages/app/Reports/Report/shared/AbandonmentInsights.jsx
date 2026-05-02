import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import strings from "../../../../../localization";
import { abandonmentDistribution, WEEKDAY_LABELS } from "./churn-utils.js";

const padHour = (h) => String(h).padStart(2, "0");

/**
 * Two small bar charts surfacing when abandonment happens most: by weekday
 * and by hour-of-day. Aggregates across every failedBasket in the report.
 */
const AbandonmentInsights = ({ entries }) => {
	const allFailed = (entries ?? []).flatMap((e) => e.failedBaskets ?? []);
	const { byHour, byWeekday, peakHour, peakWeekday } =
		abandonmentDistribution(allFailed);

	if (allFailed.length === 0) return null;

	const weekdayData = byWeekday.map((count, i) => ({
		label: strings(
			`page.reports.churn.weekday.${WEEKDAY_LABELS[i].toLowerCase()}`,
		),
		count,
		isPeak: i === peakWeekday,
	}));

	const hourData = byHour.map((count, h) => ({
		label: `${padHour(h)}:00`,
		count,
		isPeak: h === peakHour,
	}));

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<h3 className="mb-3 text-sm font-medium text-slate-700">
				{strings("page.reports.churn.insights.title")}
			</h3>
			<div className="grid gap-6 lg:grid-cols-2">
				<div>
					<div className="mb-2 flex items-center justify-between text-xs">
						<span className="text-slate-500">
							{strings("page.reports.churn.insights.byWeekday")}
						</span>
						{peakWeekday != null && (
							<span className="font-medium text-slate-700">
								{strings("page.reports.churn.insights.peak", [
									weekdayData[peakWeekday].label,
									String(byWeekday[peakWeekday]),
								])}
							</span>
						)}
					</div>
					<div className="h-32">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={weekdayData}
								margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
							>
								<XAxis
									dataKey="label"
									tick={{ fontSize: 10, fill: "#64748b" }}
								/>
								<YAxis hide />
								<Tooltip
									cursor={{ fill: "#f1f5f9" }}
									contentStyle={{
										backgroundColor: "white",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
										fontSize: "12px",
									}}
								/>
								<Bar dataKey="count" radius={[4, 4, 0, 0]}>
									{weekdayData.map((d) => (
										<Cell
											key={d.label}
											fill={d.isPeak ? "#dc2626" : "#cbd5e1"}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				<div>
					<div className="mb-2 flex items-center justify-between text-xs">
						<span className="text-slate-500">
							{strings("page.reports.churn.insights.byHour")}
						</span>
						{peakHour != null && (
							<span className="font-medium text-slate-700">
								{strings("page.reports.churn.insights.peak", [
									`${padHour(peakHour)}:00`,
									String(byHour[peakHour]),
								])}
							</span>
						)}
					</div>
					<div className="h-32">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={hourData}
								margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
							>
								<XAxis
									dataKey="label"
									tick={{ fontSize: 9, fill: "#64748b" }}
									interval={2}
								/>
								<YAxis hide />
								<Tooltip
									cursor={{ fill: "#f1f5f9" }}
									contentStyle={{
										backgroundColor: "white",
										border: "1px solid #e2e8f0",
										borderRadius: "8px",
										fontSize: "12px",
									}}
								/>
								<Bar dataKey="count" radius={[3, 3, 0, 0]}>
									{hourData.map((d) => (
										<Cell
											key={d.label}
											fill={d.isPeak ? "#dc2626" : "#cbd5e1"}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AbandonmentInsights;
