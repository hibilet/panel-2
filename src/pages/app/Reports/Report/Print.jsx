import dayjs from "dayjs";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	Cell,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ReferenceLine,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { get } from "../../../../lib/client";
import strings, { formatCurrency } from "../../../../localization";
import {
	abandonmentDistribution,
	buildJourney,
	buildSalesVsChurn,
	flattenEntries,
	formatDuration,
	normalizeDate,
	SEGMENT_TYPES,
	SEGMENT_ORDER,
	WEEKDAY_LABELS,
} from "./shared/churn-utils.js";
import { collectSalesByDay, collectChurnByDay } from "./shared/SalesVsChurnChart";

// A4 portrait at 96 DPI is 794x1123. Allow ~1cm margin (38px) all sides
// so the printable area is roughly 720x1045. Charts and tables are sized
// against that so nothing clips when the browser sends the page.
const PAGE_WIDTH = 720;
const CHART_HEIGHT = 240;

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

const formatDate = (d) => (d ? dayjs(d).format("D MMM YYYY") : "-");
const formatStamp = (d) => (d ? dayjs(d).format("D MMM YYYY HH:mm") : "-");
const padHour = (h) => String(h).padStart(2, "0");

const sumCount = (rows) =>
	(rows ?? []).reduce((s, r) => s + (Number(r?.count) || 0), 0);

// ---------- chart data helpers (mirrors SalesReportView) ----------

const aggregateByBucket = (rows, key) => {
	const m = new Map();
	for (const r of rows ?? []) {
		const raw = r?.[key];
		if (raw == null) continue;
		const k = key === "hour" ? padHour(raw) : String(raw);
		m.set(k, (m.get(k) ?? 0) + (Number(r?.count) || 0));
	}
	return m;
};

const buildHourly = (raw, leads) => {
	const r = aggregateByBucket(raw, "hour");
	const l = aggregateByBucket(leads, "hour");
	return Array.from({ length: 24 }, (_, h) => {
		const key = padHour(h);
		return {
			label: `${key}:00`,
			reservations: r.get(key) ?? 0,
			leads: l.get(key) ?? 0,
		};
	});
};

const buildDaily = (raw, leads, start, end) => {
	const r = aggregateByBucket(raw, "day");
	const l = aggregateByBucket(leads, "day");
	const s = start ? dayjs(start) : null;
	const e = end ? dayjs(end) : null;
	if (!s?.isValid?.() || !e?.isValid?.()) {
		const keys = Array.from(new Set([...r.keys(), ...l.keys()])).sort();
		return keys.map((k) => ({
			label: dayjs(k).format("D MMM"),
			reservations: r.get(k) ?? 0,
			leads: l.get(k) ?? 0,
		}));
	}
	const out = [];
	let cur = s.startOf("day");
	const last = e.startOf("day");
	while (cur.isBefore(last) || cur.isSame(last, "day")) {
		const k = cur.format("YYYY-MM-DD");
		out.push({
			label: cur.format("D MMM"),
			reservations: r.get(k) ?? 0,
			leads: l.get(k) ?? 0,
		});
		cur = cur.add(1, "day");
	}
	return out;
};

const aggregateByChannel = (rows) => {
	const m = new Map();
	for (const r of rows ?? []) {
		const name = r?.name ?? "—";
		m.set(name, (m.get(name) ?? 0) + (Number(r?.count) || 0));
	}
	return Array.from(m.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
};

// ---------- shared layout primitives ----------

const Section = ({ title, children }) => (
	<section className="print-section">
		{title && <h2>{title}</h2>}
		{children}
	</section>
);

const Stat = ({ label, value }) => (
	<div className="stat">
		<div className="stat-label">{label}</div>
		<div className="stat-value">{value}</div>
	</div>
);

// ---------- Sales report body ----------

const SalesPrint = ({ report }) => {
	const period = report?.params?.period ?? "daily";
	const isHourly = period === "daily";
	const raw = report?.raw_data ?? [];
	const leads = report?.leads_data ?? [];

	const chartData = isHourly
		? buildHourly(raw, leads)
		: buildDaily(raw, leads, report?.start, report?.end);
	const channels = aggregateByChannel(raw);
	const channelTotal = channels.reduce((s, c) => s + c.count, 0);
	const totalReservations = sumCount(raw);
	const peak = chartData.reduce(
		(best, cur) =>
			cur.reservations > (best?.reservations ?? 0) ? cur : best,
		null,
	);

	return (
		<>
			<Section>
				<div className="stats">
					<Stat
						label={strings("page.reports.sales.stats.total")}
						value={totalReservations.toLocaleString()}
					/>
					<Stat
						label={strings("page.reports.sales.stats.channels")}
						value={channels.length}
					/>
					<Stat
						label={
							isHourly
								? strings("page.reports.sales.stats.peak")
								: strings("page.reports.sales.stats.bestDay")
						}
						value={peak ? `${peak.label} (${peak.reservations})` : "—"}
					/>
				</div>
			</Section>

			<Section
				title={
					isHourly
						? strings("page.reports.sales.chart.byHour")
						: strings("page.reports.sales.chart.byDay")
				}
			>
				{isHourly ? (
					<BarChart
						width={PAGE_WIDTH}
						height={CHART_HEIGHT}
						data={chartData}
						margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 9, fill: "#475569" }}
							interval={2}
						/>
						<YAxis tick={{ fontSize: 9, fill: "#475569" }} allowDecimals={false} />
						<Bar
					dataKey="reservations"
					fill="#0f172a"
					radius={[3, 3, 0, 0]}
					isAnimationActive={false}
				/>
					</BarChart>
				) : (
					<AreaChart
						width={PAGE_WIDTH}
						height={CHART_HEIGHT}
						data={chartData}
						margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
					>
						<defs>
							<linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#0f172a" stopOpacity={0.3} />
								<stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 9, fill: "#475569" }}
							interval="preserveStartEnd"
							minTickGap={24}
						/>
						<YAxis tick={{ fontSize: 9, fill: "#475569" }} allowDecimals={false} />
						<Area
							type="monotone"
							dataKey="reservations"
							stroke="#0f172a"
							fill="url(#salesArea)"
							strokeWidth={1.5}
							isAnimationActive={false}
						/>
					</AreaChart>
				)}
			</Section>

			{channels.length > 0 && (
				<Section title={strings("page.reports.sales.byChannel.title")}>
					<BarChart
						width={PAGE_WIDTH}
						height={Math.max(120, Math.min(channels.length * 32 + 60, 360))}
						data={channels}
						layout="vertical"
						margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="#e2e8f0"
							horizontal={false}
						/>
						<XAxis
							type="number"
							tick={{ fontSize: 9, fill: "#475569" }}
							allowDecimals={false}
						/>
						<YAxis
							dataKey="name"
							type="category"
							tick={{ fontSize: 9, fill: "#475569" }}
							width={120}
						/>
						<Bar
							dataKey="count"
							radius={[0, 3, 3, 0]}
							isAnimationActive={false}
						>
							{channels.map((c, i) => (
								<Cell
									key={c.name}
									fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
								/>
							))}
						</Bar>
					</BarChart>

					<table className="data-table">
						<thead>
							<tr>
								<th>{strings("page.reports.sales.col.channel")}</th>
								<th className="num">
									{strings("page.reports.sales.col.count")}
								</th>
								<th className="num">
									{strings("page.reports.sales.col.share")}
								</th>
							</tr>
						</thead>
						<tbody>
							{channels.map((c) => {
								const share = channelTotal
									? (c.count / channelTotal) * 100
									: 0;
								return (
									<tr key={c.name}>
										<td>{c.name}</td>
										<td className="num">{c.count.toLocaleString()}</td>
										<td className="num">{share.toFixed(1)}%</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</Section>
			)}
		</>
	);
};

// ---------- Churn report body ----------

const LeadsCards = ({ leadsData }) => {
	const groups = useMemo(() => {
		const m = new Map();
		for (const l of leadsData ?? []) {
			const seg = l.segment || "other";
			if (!m.has(seg)) m.set(seg, []);
			m.get(seg).push(l);
		}
		return SEGMENT_ORDER.filter((s) => m.has(s)).map((s) => ({
			segment: s,
			leads: m.get(s),
		}));
	}, [leadsData]);

	if (groups.length === 0) return null;

	return (
		<div className="leads-grid">
			{groups.map(({ segment, leads }) => {
				const info = SEGMENT_TYPES[segment];
				return (
					<div key={segment} className="lead-card">
						<div className="lead-card-head">
							<span className={`badge ${info?.className ?? ""}`}>
								{strings(info?.labelKey ?? `segment.${segment}`)}
							</span>
							<span className="count">{leads.length}</span>
						</div>
						<div className="lead-card-body">
							{leads.length}{" "}
							{strings("page.reports.churn.users")}
						</div>
					</div>
				);
			})}
		</div>
	);
};

const RawCard = ({ entry }) => {
	const owner = entry.owner ?? {};
	const name = owner.name?.trim() ?? entry._id ?? "-";
	const email = owner.email ?? entry._id ?? "-";
	const segment = SEGMENT_TYPES[entry.segment];
	const failed = entry.failedBaskets ?? [];
	const successful = entry.allSuccessfulBasketsEver ?? [];
	const events = buildJourney(failed, successful);

	return (
		<div className="raw-card">
			<div className="raw-card-head">
				<div className="raw-card-name">
					<strong>{name}</strong>
					<span className="email">{email}</span>
				</div>
				{segment && (
					<span className={`badge ${segment.className}`}>
						{strings(segment.labelKey)}
					</span>
				)}
			</div>
			<div className="raw-card-stats">
				<span>
					{strings("page.reports.churn.failedRevenue")}:{" "}
					<strong>{formatCurrency(Number(entry.totalFailedRevenue) || 0)}</strong>
				</span>
				<span>
					{strings("page.reports.churn.failedBaskets")}:{" "}
					<strong>{Number(entry.totalFailedBaskets) || 0}</strong>
				</span>
				<span>
					{strings("page.reports.churn.avgSessionDuration")}:{" "}
					<strong>{formatDuration(entry.avgFailedSessionTime)}</strong>
				</span>
			</div>
			{events.length > 0 && (
				<ol className="journey-list">
					{events.map((e, i) => {
						const prev = i > 0 ? events[i - 1] : null;
						const waitSec = prev
							? Math.max(0, (e.at.valueOf() - prev.at.valueOf()) / 1000)
							: null;
						return (
							<li key={`${e.type}-${e.at.valueOf()}-${i}`}>
								{prev && (
									<div className="journey-wait">
										{strings("page.reports.churn.journey.waited", [
											formatDuration(waitSec),
										])}
									</div>
								)}
								<div className={`journey-event journey-${e.type}`}>
									<div className="journey-event-head">
										<span className="journey-label">
											{strings(
												e.type === "failed"
													? "page.reports.churn.journey.lost"
													: "page.reports.churn.journey.bought",
											)}
										</span>
										<span className="journey-when">
											{e.at?.isValid?.() ? e.at.format("D MMM YYYY HH:mm") : ""}
										</span>
									</div>
									{e.items?.parts?.length > 0 && (
										<div className="journey-items">
											{e.items.parts.join(", ")}
											<span className="journey-total">
												= {formatCurrency(e.items.total)}
											</span>
										</div>
									)}
									<div className="journey-meta">
										{e.sale && <span>{e.sale}</span>}
										{e.type === "failed" && (
											<span>
												{strings("page.reports.churn.journey.session", [
													formatDuration(e.sessionTimeSeconds),
												])}
											</span>
										)}
										{e.isUpsellCandidate && (
											<span className="badge upsell">
												{strings("page.reports.churn.journey.upsellTag")}
											</span>
										)}
									</div>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</div>
	);
};

const ChurnPrint = ({ report, salesByDay }) => {
	const rawData = report?.raw_data ?? [];
	const leadsData = report?.leads_data ?? [];

	const totalUsers = rawData.length;
	const totalFailedRevenue = rawData.reduce(
		(s, e) => s + (Number(e.totalFailedRevenue) || 0),
		0,
	);
	const totalFailedBaskets = rawData.reduce(
		(s, e) => s + (Number(e.totalFailedBaskets) || 0),
		0,
	);

	// Sales-vs-Churn series (compute inline so we can pass fixed dimensions
	// without going through ResponsiveContainer).
	const churnByDay = useMemo(() => collectChurnByDay(rawData), [rawData]);
	const svcData = useMemo(
		() =>
			buildSalesVsChurn(
				salesByDay ?? new Map(),
				churnByDay,
				report?.start,
				report?.end,
			),
		[salesByDay, churnByDay, report?.start, report?.end],
	);

	// Abandonment distribution
	const allFailed = rawData.flatMap((e) => e.failedBaskets ?? []);
	const { byHour, byWeekday, peakHour, peakWeekday } =
		abandonmentDistribution(allFailed);
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
		<>
			<Section>
				<div className="stats">
					<Stat
						label={strings("page.reports.churn.stats.users")}
						value={totalUsers}
					/>
					<Stat
						label={strings("page.reports.churn.stats.failedRevenue")}
						value={formatCurrency(totalFailedRevenue)}
					/>
					<Stat
						label={strings("page.reports.churn.stats.totalFailedBaskets")}
						value={totalFailedBaskets}
					/>
				</div>
			</Section>

			{svcData.length > 0 && (
				<Section title={strings("page.reports.churn.salesVsChurn") || "Sales vs Churn"}>
					{(() => {
						const totalSales = svcData.reduce((s, d) => s + (d.sales || 0), 0);
						const totalChurn = svcData.reduce((s, d) => s + (d.churn || 0), 0);
						const totalNet = totalSales - totalChurn;
						return (
							<table className="totals-table">
								<thead>
									<tr>
										<th>
											<span className="dot dot-sales" /> {strings("page.reports.churn.compare.sales")}
										</th>
										<th>
											<span className="dot dot-churn" /> {strings("page.reports.churn.compare.churn")}
										</th>
										<th>
											<span
												className={`dot ${totalNet >= 0 ? "dot-net-pos" : "dot-net-neg"}`}
											/>{" "}
											{strings("page.reports.churn.compare.net")}
										</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>{totalSales}</td>
										<td>{totalChurn}</td>
										<td className={totalNet < 0 ? "neg" : ""}>{totalNet}</td>
									</tr>
								</tbody>
							</table>
						);
					})()}
					<ComposedChart
						width={PAGE_WIDTH}
						height={CHART_HEIGHT}
						data={svcData}
						margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
						<XAxis
							dataKey="label"
							tick={{ fontSize: 9, fill: "#475569" }}
							interval="preserveStartEnd"
							minTickGap={24}
						/>
						<YAxis tick={{ fontSize: 9, fill: "#475569" }} />
						<ReferenceLine y={0} stroke="#94a3b8" />
						<Area
							type="monotone"
							dataKey="sales"
							stroke="#10b981"
							fill="#10b981"
							fillOpacity={0.25}
							isAnimationActive={false}
						/>
						<Area
							type="monotone"
							dataKey="churnNegative"
							stroke="#ef4444"
							fill="#ef4444"
							fillOpacity={0.25}
							isAnimationActive={false}
						/>
						<Line
							type="monotone"
							dataKey="net"
							stroke="#0f172a"
							strokeWidth={1.5}
							dot={false}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</Section>
			)}

			{allFailed.length > 0 && (
				<Section
					title={
						strings("page.reports.churn.abandonment.title") || "When abandonment happens"
					}
				>
					<div className="two-charts">
						<div>
							<div className="chart-subtitle">By weekday</div>
							<BarChart
								width={PAGE_WIDTH / 2 - 10}
								height={180}
								data={weekdayData}
								margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis dataKey="label" tick={{ fontSize: 8, fill: "#475569" }} />
								<YAxis
									tick={{ fontSize: 8, fill: "#475569" }}
									allowDecimals={false}
								/>
								<Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
									{weekdayData.map((d, i) => (
										<Cell
											key={`w-${i}`}
											fill={d.isPeak ? "#ef4444" : "#0f172a"}
										/>
									))}
								</Bar>
							</BarChart>
						</div>
						<div>
							<div className="chart-subtitle">By hour</div>
							<BarChart
								width={PAGE_WIDTH / 2 - 10}
								height={180}
								data={hourData}
								margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
							>
								<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
								<XAxis
									dataKey="label"
									tick={{ fontSize: 7, fill: "#475569" }}
									interval={2}
								/>
								<YAxis
									tick={{ fontSize: 8, fill: "#475569" }}
									allowDecimals={false}
								/>
								<Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
									{hourData.map((d, i) => (
										<Cell
											key={`h-${i}`}
											fill={d.isPeak ? "#ef4444" : "#0f172a"}
										/>
									))}
								</Bar>
							</BarChart>
						</div>
					</div>
				</Section>
			)}

			<Section
				title={strings("page.reports.tab.leads") || "Leads summary"}
			>
				<LeadsCards leadsData={leadsData} />
			</Section>

			<Section title={strings("page.reports.tab.raw") || "Detail"}>
				<div className="raw-list">
					{rawData.map((e) => (
						<RawCard key={e._id ?? e.userId} entry={e} />
					))}
				</div>
			</Section>

			<ChurnTablePrint entries={rawData} />
		</>
	);
};

// ---------- Churn flat table (for print) ----------

// Print-only subset. The lifetime / success columns and per-row paid
// flag noise out the page; the failed totals + recency are what an
// operator actually skims.
const TABLE_HEADERS = [
	{ key: "email", labelKey: "page.reports.churn.table.email" },
	{ key: "segment", labelKey: "page.reports.churn.table.segment" },
	{ key: "failedBaskets", labelKey: "page.reports.churn.table.failedBaskets", num: true },
	{ key: "failedRevenue", labelKey: "page.reports.churn.table.failedRevenue", num: true, money: true },
	{ key: "lastFailedAt", labelKey: "page.reports.churn.table.lastFailed" },
];

const ChurnTablePrint = ({ entries }) => {
	const rows = flattenEntries(entries);
	if (rows.length === 0) return null;

	// Group by segment in canonical order, then by failedBaskets desc, then
	// name asc within the segment so an operator scans top-to-bottom by
	// "worst churn segment" -> "highest failed basket count" -> "alphabetical
	// for tie-breaking."
	const groups = SEGMENT_ORDER
		.map((segment) => ({
			segment,
			info: SEGMENT_TYPES[segment],
			rows: rows
				.filter((r) => r.segment === segment)
				.sort(
					(a, b) =>
						(b.failedBaskets || 0) - (a.failedBaskets || 0)
						|| (a.name || a.email || "").localeCompare(b.name || b.email || ""),
				),
		}))
		.filter((g) => g.rows.length > 0);

	// Drop the segment column from per-row cells: the segment header row
	// already labels the group.
	const visibleHeaders = TABLE_HEADERS.filter((h) => h.key !== "segment");

	return (
		<Section title={strings("page.reports.tab.table") || "Table"}>
			<table className="data-table churn-table">
				<thead>
					<tr>
						{visibleHeaders.map((h) => (
							<th key={h.key} className={h.num ? "num" : ""}>
								{strings(h.labelKey)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{groups.map((g) => (
						<Fragment key={g.segment}>
							<tr className="group-row">
								<td colSpan={visibleHeaders.length}>
									{g.info ? (
										<span className={`badge ${g.info.className}`}>
											{strings(g.info.labelKey)}
										</span>
									) : (
										g.segment
									)}
									<span className="group-count">{g.rows.length}</span>
								</td>
							</tr>
							{g.rows.map((row) => (
								<tr key={`${g.segment}-${row.email}`}>
									{visibleHeaders.map((h) => {
										const v = row[h.key];
										if (h.bool) return <td key={h.key}>{v ? "✓" : "—"}</td>;
										if (h.duration) return <td key={h.key}>{formatDuration(v)}</td>;
										if (h.money) return (
											<td key={h.key} className="num">
												{formatCurrency(v || 0)}
											</td>
										);
										if (h.num) return <td key={h.key} className="num">{v ?? 0}</td>;
										return <td key={h.key}>{v || "-"}</td>;
									})}
								</tr>
							))}
						</Fragment>
					))}
				</tbody>
			</table>
		</Section>
	);
};

// ---------- Top-level page ----------

const ReportPrint = () => {
	const { id } = useParams();
	const [report, setReport] = useState(null);
	const [salesData, setSalesData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!id) return;
		get(`/reports/${id}`)
			.then((res) => setReport(res.data ?? null))
			.catch((err) => setError(err?.message ?? "Failed to load"));
	}, [id]);

	useEffect(() => {
		if (report?.type !== "churn" || !report?.params?.sale) {
			setSalesData(null);
			return;
		}
		const params = new URLSearchParams({
			sale: report.params.sale,
			start: dayjs(report.start).format("YYYY-MM-DD"),
			end: dayjs(report.end).format("YYYY-MM-DD"),
			period: "monthly",
		});
		get(`/sales/reports/sales?${params}`)
			.then((res) => setSalesData(Array.isArray(res.data) ? res.data : []))
			.catch(() => setSalesData([]));
	}, [report]);

	const salesByDay = useMemo(
		() => collectSalesByDay(salesData ?? []),
		[salesData],
	);

	// Auto-print once data is loaded. Wait a tick so charts have mounted.
	// `afterprint` closes the preview tab so the user lands back where they
	// triggered from (the report detail page in the previous tab).
	useEffect(() => {
		if (!report) return undefined;
		if (report.type === "churn" && salesData == null) return undefined;
		// Long delay so even very large raw-data lists finish layout before
		// the print dialog opens. Charts have isAnimationActive={false} so
		// the wait isn't for animation - it's for paint of the long page.
		const t = setTimeout(() => window.print(), 1500);
		const onAfter = () => window.close();
		window.addEventListener("afterprint", onAfter);
		return () => {
			clearTimeout(t);
			window.removeEventListener("afterprint", onAfter);
		};
	}, [report, salesData]);

	if (error) {
		return (
			<div style={{ padding: 24, color: "#dc2626" }}>{error}</div>
		);
	}
	if (!report) {
		return <div style={{ padding: 24 }}>Loading…</div>;
	}

	return (
		<div className="report-print">
			<style>
				{`
				html, body { background: #f1f5f9; margin: 0; }
				@page { size: A4; margin: 12mm; }
				.report-print {
					width: ${PAGE_WIDTH}px;
					margin: 16px auto;
					padding: 0 0 24px;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					color: #0f172a;
					font-size: 11px;
					line-height: 1.4;
				}
				.report-print h1 {
					font-size: 20px;
					font-weight: 600;
					margin: 0 0 4px;
				}
				.report-print h2 {
					font-size: 13px;
					font-weight: 600;
					margin: 16px 0 8px;
					color: #334155;
				}
				.report-print .meta {
					font-size: 11px;
					color: #64748b;
					margin-bottom: 12px;
				}
				.report-print .badge {
					display: inline-block;
					padding: 2px 8px;
					border-radius: 999px;
					font-size: 10px;
					font-weight: 500;
					margin-left: 6px;
					vertical-align: middle;
				}
				.report-print .stats {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 8px;
				}
				.report-print .stat {
					border: none;
					border-radius: 8px;
					padding: 8px 10px;
					background: white;
				}
				.report-print .stat-label {
					font-size: 10px;
					color: #64748b;
					margin-bottom: 2px;
				}
				.report-print .stat-value {
					font-size: 16px;
					font-weight: 600;
				}
				.report-print .print-section {
					background: white;
					border: none;
					border-radius: 8px;
					padding: 12px;
					margin-bottom: 10px;
					break-inside: avoid;
					page-break-inside: avoid;
				}
				.report-print .data-table,
				.report-print .journey-table {
					width: 100%;
					border-collapse: collapse;
					font-size: 10px;
					margin-top: 8px;
				}
				.report-print .data-table th,
				.report-print .data-table td,
				.report-print .journey-table th,
				.report-print .journey-table td {
					border-bottom: 1px solid #e2e8f0;
					padding: 4px 6px;
					text-align: left;
				}
				.report-print .data-table th,
				.report-print .journey-table th {
					background: #f8fafc;
					font-weight: 500;
					color: #475569;
				}
				.report-print td.num,
				.report-print th.num {
					text-align: right;
				}
				.report-print .totals-table {
					width: auto;
					border-collapse: collapse;
					margin: 0 0 8px;
					font-size: 10px;
				}
				.report-print .totals-table th,
				.report-print .totals-table td {
					padding: 3px 10px;
					text-align: left;
					border: none;
				}
				.report-print .totals-table th {
					background: transparent;
					color: #64748b;
					font-weight: 500;
				}
				.report-print .totals-table td {
					font-weight: 600;
					color: #0f172a;
				}
				.report-print .totals-table td.neg {
					color: #b91c1c;
				}
				.report-print .totals-table .dot {
					display: inline-block;
					width: 7px;
					height: 7px;
					border-radius: 999px;
					margin-right: 4px;
					vertical-align: middle;
				}
				.report-print .dot-sales { background: #10b981; }
				.report-print .dot-churn { background: #ef4444; }
				.report-print .dot-net-pos { background: #0f172a; }
				.report-print .dot-net-neg { background: #b91c1c; }
				.report-print .churn-table {
					font-size: 9px;
					table-layout: auto;
				}
				.report-print .churn-table th,
				.report-print .churn-table td {
					padding: 6px 8px;
					white-space: nowrap;
					vertical-align: middle;
				}
				.report-print .churn-table tbody tr:nth-child(even) {
					background: #f8fafc;
				}
				.report-print .churn-table .badge {
					margin-left: 0;
					font-size: 8px;
					padding: 1px 6px;
				}
				.report-print .churn-table .group-row td {
					background: #f1f5f9;
					font-weight: 600;
					padding-top: 8px;
					padding-bottom: 8px;
					border-top: 1px solid #cbd5e1;
				}
				.report-print .churn-table .group-row .group-count {
					float: right;
					font-size: 9px;
					color: #64748b;
					font-weight: 500;
				}
				.report-print .churn-table tbody tr.group-row + tr td {
					border-top: 0;
				}
				.report-print .two-charts {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 10px;
				}
				.report-print .chart-subtitle {
					font-size: 10px;
					color: #475569;
					margin-bottom: 4px;
				}
				.report-print .leads-grid {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 8px;
				}
				.report-print .lead-card {
					border: none;
					border-radius: 6px;
					padding: 8px;
				}
				.report-print .lead-card-head {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 4px;
				}
				.report-print .lead-card .count {
					font-size: 16px;
					font-weight: 600;
				}
				.report-print .lead-card-body {
					font-size: 10px;
					color: #64748b;
				}
				.report-print .raw-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				.report-print .raw-card {
					border: none;
					border-radius: 6px;
					padding: 10px;
					break-inside: avoid;
					page-break-inside: avoid;
				}
				.report-print .raw-card-head {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
					margin-bottom: 4px;
				}
				.report-print .raw-card-name strong {
					margin-right: 6px;
				}
				.report-print .raw-card-name .email {
					color: #64748b;
					font-size: 10px;
				}
				.report-print .raw-card-stats {
					display: flex;
					gap: 14px;
					font-size: 10px;
					color: #475569;
					margin-bottom: 6px;
				}
				.report-print .journey-list {
					list-style: none;
					padding: 0;
					margin: 6px 0 0;
				}
				.report-print .journey-list li {
					margin: 0;
				}
				.report-print .journey-wait {
					font-size: 9px;
					color: #94a3b8;
					padding: 2px 0 2px 8px;
					margin-left: 4px;
					border-left: 1px dashed #cbd5e1;
				}
				.report-print .journey-event {
					border: none;
					border-radius: 5px;
					padding: 6px 8px;
					margin-bottom: 4px;
					font-size: 10px;
				}
				.report-print .journey-failed {
					background: #fef2f2;
				}
				.report-print .journey-failed .journey-label {
					color: #991b1b;
					font-weight: 600;
				}
				.report-print .journey-succeeded {
					background: #ecfdf5;
				}
				.report-print .journey-succeeded .journey-label {
					color: #065f46;
					font-weight: 600;
				}
				.report-print .journey-event-head {
					display: flex;
					justify-content: space-between;
					align-items: baseline;
					gap: 8px;
				}
				.report-print .journey-when {
					color: #475569;
					font-size: 9px;
				}
				.report-print .journey-items {
					margin-top: 2px;
					color: #334155;
				}
				.report-print .journey-total {
					margin-left: 6px;
					color: #64748b;
				}
				.report-print .journey-meta {
					margin-top: 2px;
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
					color: #64748b;
					font-size: 9px;
				}
				.report-print .badge.upsell {
					background: #ede9fe;
					color: #5b21b6;
					margin-left: 0;
				}
				@media print {
					html, body { background: white; }
					.report-print {
						margin: 0 auto;
						box-shadow: none;
					}
					.recharts-tooltip-wrapper { display: none !important; }
				}
				`}
			</style>

			<header>
				<h1>
					{report.name}
					<span
						className="badge"
						style={
							report.type === "churn"
								? { background: "#ede9fe", color: "#5b21b6" }
								: { background: "#d1fae5", color: "#065f46" }
						}
					>
						{report.type}
					</span>
				</h1>
				<div className="meta">
					{formatDate(report.end)} – {formatDate(report.start)}
					{report.createdAt && (
						<>
							{" · "}
							{strings("page.reports.generatedOn")}{" "}
							{formatDate(report.createdAt)}
						</>
					)}
				</div>
			</header>

			{report.type === "sales" ? (
				<SalesPrint report={report} />
			) : (
				<ChurnPrint report={report} salesByDay={salesByDay} />
			)}
		</div>
	);
};

export default ReportPrint;
