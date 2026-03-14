import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { get } from "../../lib/client";

/** 5-min bucket key in ms for robust interval matching */
const bucketKey = (d) =>
	Math.floor(dayjs(d).valueOf() / 300000) * 300000;

/**
 * Builds timeline data: 1 hour before event start to 2 hours after (5-min intervals).
 * Merges API read-by-interval data into the timeline.
 */
const buildTimelineData = (eventStart, apiData = []) => {
	const start = dayjs(eventStart).subtract(1, "hour");
	const byBucket = Object.fromEntries(
		(apiData ?? []).map((d) => [bucketKey(d.interval), d.count ?? 0]),
	);

	const result = [];
	for (let i = 0; i <= 36; i++) {
		const interval = start.add(i * 5, "minute");
		const key = bucketKey(interval);
		const count = byBucket[key] ?? 0;
		result.push({
			interval: interval.toISOString(),
			label: interval.format("HH:mm"),
			count,
		});
	}
	return result;
};

const ReadByChart = ({ saleId, eventStart, height = 200 }) => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const start = eventStart ? dayjs(eventStart) : null;
	const timelineData = useMemo(() => {
		if (!start) return [];
		return buildTimelineData(start, data);
	}, [start, data]);

	const fetchData = useCallback(async () => {
		if (!saleId) return;
		setLoading(true);
		setError(null);
		try {
			const res = await get(`/sales/${saleId}/reservations/readBy`);
			setData(res?.data ?? []);
		} catch (err) {
			setError(err?.message ?? "Failed to load chart data");
			setData([]);
		} finally {
			setLoading(false);
		}
	}, [saleId]);

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 30000);
		return () => clearInterval(interval);
	}, [fetchData]);

	if (!eventStart) return null;

	const colors = {
		grid: "#e2e8f0",
		tick: "#64748b",
		line: "#0f172a",
		tooltipBg: "white",
		tooltipBorder: "#e2e8f0",
	};

	if (loading && timelineData.length === 0) {
		return (
			<div
				className="animate-shimmer rounded-lg"
				style={{ height }}
			/>
		);
	}

	return (
		<div className="w-full" style={{ height }}>
			{error && (
				<div className="mb-2 text-sm text-red-600">{error}</div>
			)}
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={timelineData}
					margin={{ top: 5, right: 10, left: -20, bottom: 40 }}
				>
					<defs>
						<linearGradient id="readByGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
							<stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="label"
						angle={-45}
						tick={{ fontSize: 11, fill: colors.tick, textAnchor: "end" }}
						tickLine={{ stroke: colors.grid }}
						axisLine={{ stroke: colors.grid }}
					/>
					<YAxis
						tick={{ fontSize: 11, fill: colors.tick }}
						tickLine={{ stroke: colors.grid }}
						axisLine={{ stroke: colors.grid }}
						allowDecimals={false}
					/>
					<Tooltip
						formatter={(value) => [value, "Read"]}
						labelFormatter={(label, payload) => {
							const p = payload?.[0]?.payload;
							return p ? `${p.label} — ${p.count} read` : label;
						}}
						contentStyle={{
							backgroundColor: colors.tooltipBg,
							border: `1px solid ${colors.tooltipBorder}`,
							borderRadius: "8px",
							boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
						}}
					/>
					<Area
						type="monotone"
						dataKey="count"
						stroke={colors.line}
						strokeWidth={2}
						fill="url(#readByGradient)"
						dot={{ fill: colors.line, strokeWidth: 0, r: 2 }}
						activeDot={{
							r: 4,
							fill: colors.line,
							stroke: colors.tooltipBg,
							strokeWidth: 2,
						}}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
};

export default ReadByChart;
