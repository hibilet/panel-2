import { useEffect, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useApp } from "../../../context";
import { get, getText } from "../../../lib/client";
import { showToast } from "../../../lib/toastStore";

const SEGMENT_COLOR = {
	whale: "#7c3aed",
	fan: "#2563eb",
	repeat: "#0891b2",
	hesitant: "#d97706",
	direct: "#059669",
	one_time: "#94a3b8",
};
const SEGMENT_LABEL = {
	whale: "Whales",
	fan: "Fans",
	repeat: "Repeat",
	hesitant: "Hesitant",
	direct: "Direct",
	one_time: "One-time",
};
// Behavioral grouping for the "what to focus on" emphasis.
const GROUPS = {
	returning: { label: "Returning", segs: ["whale", "fan", "repeat"], tone: "text-emerald-600", desc: "Your core - they came back" },
	single: { label: "Single purchase", segs: ["direct", "one_time"], tone: "text-slate-700", desc: "Bought once" },
	wavering: { label: "Hesitant", segs: ["hesitant"], tone: "text-amber-600", desc: "Interested but dropped baskets - win them back" },
};
const RANGES = [
	{ label: "30d", days: 30 },
	{ label: "90d", days: 90 },
	{ label: "1y", days: 365 },
	{ label: "All", days: 1825 },
];

const pctOf = (n, d) => (d ? Math.round((n / d) * 100) : 0);

const Card = ({ title, hint, action, children }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<div className="mb-4 flex items-start justify-between gap-3">
			<div>
				<h2 className="text-sm font-semibold text-slate-900">{title}</h2>
				{hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
			</div>
			{action}
		</div>
		{children}
	</div>
);

const Stat = ({ label, value, sub, tone }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
		<p className={`mt-0.5 text-xl font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
		{sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
	</div>
);

const Analytics = () => {
	const { sales: allSales } = useApp();
	const [scopeSale, setScopeSale] = useState("all");
	const [rangeDays, setRangeDays] = useState(365);

	const [segments, setSegments] = useState([]);
	const [winback, setWinback] = useState([]);
	const [daily, setDaily] = useState([]);
	const [salesPerf, setSalesPerf] = useState([]);
	const [loading, setLoading] = useState(true);
	const [scopeLoading, setScopeLoading] = useState(false);
	const [error, setError] = useState(null);
	const [exporting, setExporting] = useState(null);

	const exportAudience = async (segment) => {
		setExporting(segment ?? "all");
		try {
			const params = new URLSearchParams({ type: "segment" });
			if (segment) params.set("segment", segment);
			if (scopeSale !== "all") params.set("sale", scopeSale);
			const { text } = await getText(`/audiences/export?${params}`);
			const rows = Math.max(0, text.trim().split("\n").length - 1);
			const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audience-${segment ?? "all"}.csv`;
			a.click();
			URL.revokeObjectURL(url);
			showToast("success", `Exported ${rows} consented contact${rows === 1 ? "" : "s"}`);
		} catch (err) {
			if (!err?.__sessionExpired) showToast("error", "Export failed");
		} finally {
			setExporting(null);
		}
	};

	// Static blocks (winback + sales perf) load once; filtered client-side.
	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const [w, sa] = await Promise.all([
					get("/analytics/winback"),
					get("/analytics/sales"),
				]);
				if (!alive) return;
				setWinback(w.data ?? []);
				setSalesPerf(sa.data ?? []);
			} catch (err) {
				if (alive) setError(err?.message ?? "Failed to load analytics");
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	// Scoped blocks (segments + trend) refetch on sale / range change.
	useEffect(() => {
		let alive = true;
		setScopeLoading(true);
		const saleQs = scopeSale !== "all" ? `&sale=${scopeSale}` : "";
		Promise.all([
			get(`/analytics/segments?${scopeSale !== "all" ? `sale=${scopeSale}` : ""}`),
			get(`/analytics/sales-daily?days=${rangeDays}${saleQs}`),
		])
			.then(([s, d]) => {
				if (!alive) return;
				setSegments(s.data ?? []);
				setDaily(d.data ?? []);
			})
			.catch((err) => alive && setError(err?.message ?? "Failed to load analytics"))
			.finally(() => alive && setScopeLoading(false));
		return () => {
			alive = false;
		};
	}, [scopeSale, rangeDays]);

	const segData = useMemo(
		() =>
			(segments ?? [])
				.map((r) => ({
					segment: r.segment,
					label: SEGMENT_LABEL[r.segment] ?? r.segment,
					buyers: r.buyers ?? 0,
					avgLtvCents: r.avgLtvCents ?? 0,
				}))
				.sort((a, b) => b.buyers - a.buyers),
		[segments],
	);
	const totalBuyers = useMemo(() => segData.reduce((s, r) => s + r.buyers, 0), [segData]);
	const groupStats = useMemo(() => {
		const by = Object.fromEntries(segData.map((r) => [r.segment, r.buyers]));
		const sum = (segs) => segs.reduce((s, k) => s + (by[k] ?? 0), 0);
		return Object.fromEntries(
			Object.entries(GROUPS).map(([key, g]) => [key, sum(g.segs)]),
		);
	}, [segData]);

	const dailyData = useMemo(
		() => (daily ?? []).map((r) => ({ day: r.day, net: (r.netCents ?? 0) / 100, tickets: r.tickets ?? 0 })),
		[daily],
	);
	const totals = useMemo(() => {
		const tickets = daily.reduce((s, r) => s + (r.tickets ?? 0), 0);
		const net = daily.reduce((s, r) => s + (r.netCents ?? 0), 0);
		return { tickets, net };
	}, [daily]);

	const winbackRows = useMemo(
		() => (scopeSale === "all" ? winback : winback.filter((r) => String(r.sale) === scopeSale)),
		[winback, scopeSale],
	);
	const salesRows = useMemo(
		() => (scopeSale === "all" ? salesPerf : salesPerf.filter((r) => String(r._id) === scopeSale)),
		[salesPerf, scopeSale],
	);
	const winbackAgg = useMemo(() => {
		const churned = winbackRows.reduce((s, r) => s + (r.churnedCount ?? 0), 0);
		const recovered = winbackRows.reduce((s, r) => s + (r.recovered ?? 0), 0);
		return { churned, recovered, rate: pctOf(recovered, churned) };
	}, [winbackRows]);

	if (loading) return <p className="text-sm text-slate-500">Loading analytics...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const scopeName = scopeSale === "all" ? "all events" : (allSales ?? []).find((s) => (s.id ?? s._id) === scopeSale)?.name ?? "event";

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={scopeSale}
						onChange={(e) => setScopeSale(e.target.value)}
						className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
					>
						<option value="all">All events</option>
						{(allSales ?? []).map((s) => (
							<option key={s.id ?? s._id} value={s.id ?? s._id}>
								{s.name}
							</option>
						))}
					</select>
					<div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
						{RANGES.map((r) => (
							<button
								key={r.days}
								type="button"
								onClick={() => setRangeDays(r.days)}
								className={`px-2.5 py-1.5 text-xs font-medium ${rangeDays === r.days ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
							>
								{r.label}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<Stat label="Tickets sold" value={totals.tickets.toLocaleString()} sub={scopeName} />
				<Stat label="Buyers" value={totalBuyers.toLocaleString()} />
				<Stat label="Returning" value={`${pctOf(groupStats.returning, totalBuyers)}%`} sub={`${(groupStats.returning ?? 0).toLocaleString()} buyers`} tone="text-emerald-600" />
				<Stat label="Win-back" value={`${winbackAgg.rate}%`} sub={`${winbackAgg.recovered}/${winbackAgg.churned} recovered`} />
			</div>

			{/* Emphasis: what to focus on */}
			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				{Object.entries(GROUPS).map(([key, g]) => {
					const n = groupStats[key] ?? 0;
					return (
						<div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
							<div className="flex items-baseline justify-between">
								<p className="text-sm font-semibold text-slate-900">{g.label}</p>
								<p className={`text-lg font-bold ${g.tone}`}>{pctOf(n, totalBuyers)}%</p>
							</div>
							<p className="mt-0.5 text-xs text-slate-500">{g.desc}</p>
							<div className="mt-2 flex items-center justify-between">
								<span className="text-xs text-slate-400">{n.toLocaleString()} buyers</span>
								{key === "wavering" && n > 0 && (
									<button
										type="button"
										onClick={() => exportAudience("hesitant")}
										disabled={!!exporting}
										className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
									>
										{exporting === "hesitant" ? "..." : "Export & win back"}
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<Card
				title="Client base by segment"
				hint={`Behavioral mix for ${scopeName}. Export a segment to your own email tool - only marketing-consented contacts are included.`}
				action={
					segData.length > 0 && (
						<button
							type="button"
							onClick={() => exportAudience(null)}
							disabled={!!exporting}
							className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
						>
							<i className="fa-solid fa-download mr-1.5" aria-hidden />
							{exporting === "all" ? "Exporting..." : "Export all"}
						</button>
					)
				}
			>
				{scopeLoading ? (
					<p className="text-sm text-slate-500">Loading...</p>
				) : segData.length === 0 ? (
					<p className="text-sm text-slate-500">No buyer data for {scopeName}.</p>
				) : (
					<div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
						<ResponsiveContainer width="100%" height={240}>
							<PieChart>
								<Pie data={segData} dataKey="buyers" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2}>
									{segData.map((r) => (
										<Cell key={r.segment} fill={SEGMENT_COLOR[r.segment] ?? "#94a3b8"} />
									))}
								</Pie>
								<Tooltip formatter={(v, n) => [`${v.toLocaleString()} (${pctOf(v, totalBuyers)}%)`, n]} />
							</PieChart>
						</ResponsiveContainer>
						<div className="space-y-2">
							{segData.map((r) => (
								<div key={r.segment} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
									<span className="flex items-center gap-2">
										<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLOR[r.segment] ?? "#94a3b8" }} />
										<span className="font-medium text-slate-700">{r.label}</span>
										<span className="text-slate-400">{r.buyers.toLocaleString()} · {pctOf(r.buyers, totalBuyers)}%</span>
									</span>
									<button
										type="button"
										onClick={() => exportAudience(r.segment)}
										disabled={!!exporting}
										className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
									>
										{exporting === r.segment ? "..." : "Export"}
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</Card>

			<Card title="Sales trend" hint={`Tickets per day - ${scopeName}`}>
				{scopeLoading ? (
					<p className="text-sm text-slate-500">Loading...</p>
				) : dailyData.length === 0 ? (
					<p className="text-sm text-slate-500">No sales in range.</p>
				) : (
					<ResponsiveContainer width="100%" height={260}>
						<AreaChart data={dailyData} margin={{ left: 8, right: 8 }}>
							<defs>
								<linearGradient id="tk" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
									<stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={32} />
							<YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
							<Tooltip formatter={(v) => [Number(v).toLocaleString(), "Tickets"]} />
							<Area type="monotone" dataKey="tickets" stroke="#2563eb" fill="url(#tk)" strokeWidth={2} />
						</AreaChart>
					</ResponsiveContainer>
				)}
			</Card>

			<Card title="Win-back (remarketing)" hint="Churned leads who later purchased, per churn report">
				{winbackRows.length === 0 ? (
					<p className="text-sm text-slate-500">No churn reports for {scopeName}.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
									<th className="py-2 pr-4">Report end</th>
									<th className="py-2 pr-4">Churned</th>
									<th className="py-2 pr-4">Recovered</th>
									<th className="py-2">Rate</th>
								</tr>
							</thead>
							<tbody>
								{winbackRows.slice(0, 20).map((r) => (
									<tr key={r._id} className="border-b border-slate-100 last:border-0">
										<td className="py-2 pr-4 text-slate-700">{r.reportEnd ? new Date(r.reportEnd).toLocaleDateString() : "-"}</td>
										<td className="py-2 pr-4 text-slate-700">{r.churnedCount}</td>
										<td className="py-2 pr-4 text-slate-700">{r.recovered}</td>
										<td className="py-2">
											<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.recoveryRatePct >= 10 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
												{r.recoveryRatePct}%
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			<Card title="Sales performance" hint="Sell-through, no-show and refund rate per event">
				{salesRows.length === 0 ? (
					<p className="text-sm text-slate-500">No sales yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
									<th className="py-2 pr-4">Event</th>
									<th className="py-2 pr-4">Sold</th>
									<th className="py-2 pr-4">Capacity</th>
									<th className="py-2 pr-4">Sell-through</th>
									<th className="py-2 pr-4">No-show</th>
									<th className="py-2">Refund</th>
								</tr>
							</thead>
							<tbody>
								{salesRows.slice(0, 50).map((r) => (
									<tr key={r._id} className="border-b border-slate-100 last:border-0">
										<td className="py-2 pr-4 font-medium text-slate-800">{r.name ?? "-"}</td>
										<td className="py-2 pr-4 text-slate-700">{(r.sold ?? 0).toLocaleString()}</td>
										<td className="py-2 pr-4 text-slate-500">{(r.capacity ?? 0).toLocaleString()}</td>
										<td className="py-2 pr-4 text-slate-700">{r.sellThroughPct ?? 0}%</td>
										<td className="py-2 pr-4">
											<span className={r.noShowPct >= 20 ? "font-medium text-amber-600" : "text-slate-700"}>{r.noShowPct ?? 0}%</span>
										</td>
										<td className="py-2">
											<span className={r.refundRatePct >= 10 ? "font-medium text-red-600" : "text-slate-700"}>{r.refundRatePct ?? 0}%</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
};

export default Analytics;
