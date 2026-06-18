import { useEffect, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { get, getText } from "../../../lib/client";
import { showToast } from "../../../lib/toastStore";

const SEGMENT_COLOR = {
	whale: "#7c3aed",
	fan: "#2563eb",
	repeat: "#0891b2",
	hesitant: "#d97706",
	direct: "#059669",
	one_time: "#64748b",
};
const SEGMENT_LABEL = {
	whale: "Whales",
	fan: "Fans",
	repeat: "Repeat",
	hesitant: "Hesitant",
	direct: "Direct",
	one_time: "One-time",
};

const eur = (cents) => `€${((cents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const Card = ({ title, hint, children }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<div className="mb-4">
			<h2 className="text-sm font-semibold text-slate-900">{title}</h2>
			{hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
		</div>
		{children}
	</div>
);

const Stat = ({ label, value, sub }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
		<p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
		<p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
		{sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
	</div>
);

const Analytics = () => {
	const [segments, setSegments] = useState([]);
	const [winback, setWinback] = useState([]);
	const [daily, setDaily] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [exporting, setExporting] = useState(null);

	// Pull a consent-gated audience CSV and trigger a browser download.
	const exportAudience = async (segment) => {
		setExporting(segment ?? "all");
		try {
			const qs = segment ? `?type=segment&segment=${segment}` : "?type=segment";
			const { text } = await getText(`/audiences/export${qs}`);
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

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const [s, w, d] = await Promise.all([
					get("/analytics/segments"),
					get("/analytics/winback"),
					get("/analytics/sales-daily?days=365"),
				]);
				if (!alive) return;
				setSegments(s.data ?? []);
				setWinback(w.data ?? []);
				setDaily(d.data ?? []);
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

	const dailyData = useMemo(
		() => (daily ?? []).map((r) => ({ day: r.day, net: (r.netCents ?? 0) / 100, tickets: r.tickets ?? 0 })),
		[daily],
	);
	const totals = useMemo(() => {
		const net = daily.reduce((s, r) => s + (r.netCents ?? 0), 0);
		const tickets = daily.reduce((s, r) => s + (r.tickets ?? 0), 0);
		const refunds = daily.reduce((s, r) => s + (r.refundedCount ?? 0), 0);
		return { net, tickets, refunds };
	}, [daily]);

	const winbackAgg = useMemo(() => {
		const churned = winback.reduce((s, r) => s + (r.churnedCount ?? 0), 0);
		const recovered = winback.reduce((s, r) => s + (r.recovered ?? 0), 0);
		const revenue = winback.reduce((s, r) => s + (r.recoveredRevenueCents ?? 0), 0);
		return {
			churned,
			recovered,
			revenue,
			rate: churned ? Math.round((recovered / churned) * 1000) / 10 : 0,
		};
	}, [winback]);

	if (loading) return <p className="text-sm text-slate-500">Loading analytics...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<Stat label="Tickets sold" value={totals.tickets.toLocaleString()} />
				<Stat label="Net revenue" value={eur(totals.net)} />
				<Stat label="Buyers" value={totalBuyers.toLocaleString()} />
				<Stat
					label="Win-back rate"
					value={`${winbackAgg.rate}%`}
					sub={`${winbackAgg.recovered}/${winbackAgg.churned} churned recovered`}
				/>
			</div>

			<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 className="text-sm font-semibold text-slate-900">Client base by segment</h2>
						<p className="mt-0.5 text-xs text-slate-500">
							How your buyers behave - fans, hesitant, one-timers. Export a segment to your
							own email tool; only contacts who consented to marketing are included.
						</p>
					</div>
					{segData.length > 0 && (
						<button
							type="button"
							onClick={() => exportAudience(null)}
							disabled={!!exporting}
							className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
						>
							<i className="fa-solid fa-download mr-1.5" aria-hidden />
							{exporting === "all" ? "Exporting..." : "Export all"}
						</button>
					)}
				</div>
				{segData.length === 0 ? (
					<p className="text-sm text-slate-500">No buyer data yet.</p>
				) : (
					<>
						<ResponsiveContainer width="100%" height={Math.max(180, segData.length * 44)}>
							<BarChart data={segData} layout="vertical" margin={{ left: 24, right: 24 }}>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} />
								<XAxis type="number" tick={{ fontSize: 12 }} />
								<YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
								<Tooltip
									formatter={(v, n) => (n === "buyers" ? [v.toLocaleString(), "Buyers"] : v)}
								/>
								<Bar dataKey="buyers" radius={[0, 4, 4, 0]}>
									{segData.map((r) => (
										<Cell key={r.segment} fill={SEGMENT_COLOR[r.segment] ?? "#64748b"} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
						<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
							{segData.map((r) => (
								<div key={r.segment} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
									<span className="flex items-center gap-2">
										<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLOR[r.segment] ?? "#64748b" }} />
										{r.label}
										<span className="text-slate-400">· {r.buyers.toLocaleString()} · avg {eur(r.avgLtvCents)}</span>
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
					</>
				)}
			</div>

			<Card title="Successful sales trend" hint="Net revenue per day (last 365 days)">
				{dailyData.length === 0 ? (
					<p className="text-sm text-slate-500">No sales in range.</p>
				) : (
					<ResponsiveContainer width="100%" height={260}>
						<AreaChart data={dailyData} margin={{ left: 8, right: 8 }}>
							<defs>
								<linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
									<stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={32} />
							<YAxis tick={{ fontSize: 11 }} width={56} />
							<Tooltip formatter={(v) => [`€${Number(v).toLocaleString()}`, "Net"]} />
							<Area type="monotone" dataKey="net" stroke="#2563eb" fill="url(#net)" strokeWidth={2} />
						</AreaChart>
					</ResponsiveContainer>
				)}
			</Card>

			<Card title="Win-back (remarketing)" hint="Churned leads who later purchased, per churn report">
				{winback.length === 0 ? (
					<p className="text-sm text-slate-500">No churn reports yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
									<th className="py-2 pr-4">Report end</th>
									<th className="py-2 pr-4">Churned</th>
									<th className="py-2 pr-4">Recovered</th>
									<th className="py-2 pr-4">Rate</th>
									<th className="py-2">Recovered revenue</th>
								</tr>
							</thead>
							<tbody>
								{winback.slice(0, 20).map((r) => (
									<tr key={r._id} className="border-b border-slate-100 last:border-0">
										<td className="py-2 pr-4 text-slate-700">{r.reportEnd ? new Date(r.reportEnd).toLocaleDateString() : "-"}</td>
										<td className="py-2 pr-4 text-slate-700">{r.churnedCount}</td>
										<td className="py-2 pr-4 text-slate-700">{r.recovered}</td>
										<td className="py-2 pr-4">
											<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.recoveryRatePct >= 10 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
												{r.recoveryRatePct}%
											</span>
										</td>
										<td className="py-2 text-slate-700">{eur(r.recoveredRevenueCents)}</td>
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
