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
import { ExpiryBadge, Info } from "../../../components/shared";
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
// Actionable groups: the segments, a benefit framing, and the CTA copy.
const GROUPS = [
	{ key: "returning", label: "Returning", segs: ["whale", "fan", "repeat"], tone: "emerald", desc: "Your core - they came back", cta: "Reward loyal customers" },
	{ key: "single", label: "Single purchase", segs: ["direct", "one_time"], tone: "slate", desc: "Bought once - nudge them to a second event", cta: "Promote another event" },
	{ key: "wavering", label: "Hesitant", segs: ["hesitant"], tone: "amber", desc: "Interested but dropped baskets", cta: "Win them back" },
];
const TONE = {
	emerald: { text: "text-emerald-600", btn: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
	slate: { text: "text-slate-700", btn: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50" },
	amber: { text: "text-amber-600", btn: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" },
};
const RANGES = [
	{ label: "30d", days: 30 },
	{ label: "90d", days: 90 },
	{ label: "1y", days: 365 },
	{ label: "All", days: 1825 },
];

const pctOf = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const saleIdOf = (s) => s.id ?? s._id;

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

const titleCase = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "-");

// Mobile-friendly horizontal distribution bars for a {key,count} list.
const Dist = ({ title, info, rows, labelFn = titleCase, empty }) => {
	const total = (rows ?? []).reduce((s, r) => s + r.count, 0);
	return (
		<div>
			<p className="mb-2 flex items-center text-xs font-semibold text-slate-700">
				{title}
				<Info text={info} />
			</p>
			{!rows || rows.length === 0 ? (
				<p className="text-xs text-slate-400">{empty ?? "No data"}</p>
			) : (
				<div className="space-y-1.5">
					{rows.slice(0, 8).map((r) => (
						<div key={r.key ?? "na"}>
							<div className="flex justify-between text-[11px] text-slate-600">
								<span className="truncate pr-2">{labelFn(r.key)}</span>
								<span className="shrink-0 tabular-nums">{r.count.toLocaleString()} · {pctOf(r.count, total)}%</span>
							</div>
							<div className="mt-0.5 h-1.5 rounded bg-slate-100">
								<div className="h-1.5 rounded bg-blue-500" style={{ width: `${pctOf(r.count, total)}%` }} />
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

const Stat = ({ label, value, sub, tone, info }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
			{label}
			<Info text={info} />
		</p>
		<p className={`mt-0.5 text-xl font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
		{sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
	</div>
);

const NO_SHOW_INFO =
	"Tickets sold but never scanned at the gate, for events that have ended. Only meaningful if you scan tickets with the Reader - unscanned events read as 100% no-show.";
const SEGMENT_INFO = {
	whale: "Highest lifetime spend - your most valuable buyers.",
	fan: "Bought tickets to 3+ different events - loyal followers.",
	repeat: "Came back for a second event.",
	hesitant: "Abandoned 2+ baskets - interested but wavering. Prime win-back targets.",
	direct: "Bought quickly with no abandoned baskets - decisive first-timers.",
	one_time: "Bought a single event, then stopped.",
};
const INFO = {
	buyers: "Distinct customers with at least one successful purchase in scope.",
	returning: "Buyers who came back - whales, fans and repeat customers combined.",
	winback: "Share of previously-churned leads who later purchased. Your remarketing effectiveness.",
	tickets: "Successful + scanned tickets, summed over the selected range.",
	sellThrough: "Tickets sold vs total capacity across the events in scope.",
	refund: "Share of an event's reservations that were refunded.",
	trend: "Tickets confirmed per day. For a single event this spans its full on-sale lifetime.",
	segment: "Behavioral group derived from purchase history and checkout journey.",
};

const Analytics = () => {
	const { sales: allSales } = useApp();
	const [tab, setTab] = useState("audience");
	const [scopeSale, setScopeSale] = useState("all");
	const [rangeDays, setRangeDays] = useState(365);

	const [pastSales, setPastSales] = useState([]);
	const [segments, setSegments] = useState([]);
	const [demo, setDemo] = useState(null);
	const [winback, setWinback] = useState([]);
	const [daily, setDaily] = useState([]);
	const [salesPerf, setSalesPerf] = useState([]);
	const [loading, setLoading] = useState(true);
	const [scopeLoading, setScopeLoading] = useState(false);
	const [error, setError] = useState(null);
	const [exporting, setExporting] = useState(null);

	// segs: array (group) or string (single). name: download/toast label.
	const exportAudience = async (segs, name) => {
		const key = name ?? (Array.isArray(segs) ? segs.join(",") : segs ?? "all");
		setExporting(key);
		try {
			const params = new URLSearchParams({ type: "segment" });
			if (Array.isArray(segs)) params.set("segments", segs.join(","));
			else if (segs) params.set("segment", segs);
			if (scopeSale !== "all") params.set("sale", scopeSale);
			const { text } = await getText(`/audiences/export?${params}`);
			const rows = Math.max(0, text.trim().split("\n").length - 1);
			const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audience-${key}.csv`;
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
				const [w, sa, past] = await Promise.all([
					get("/analytics/winback"),
					get("/analytics/sales"),
					get("/sales?past=true").catch(() => ({ data: [] })),
				]);
				if (!alive) return;
				setWinback(w.data ?? []);
				setSalesPerf(sa.data ?? []);
				setPastSales(past.data ?? []);
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

	useEffect(() => {
		let alive = true;
		setScopeLoading(true);
		// A single event shows its FULL on-sale lifetime (start->end), not a
		// rolling window - so pull wide and let the event's days define the span.
		const effectiveDays = scopeSale !== "all" ? 1825 : rangeDays;
		const saleQs = scopeSale !== "all" ? `&sale=${scopeSale}` : "";
		const saleParam = scopeSale !== "all" ? `sale=${scopeSale}` : "";
		Promise.all([
			get(`/analytics/segments?${saleParam}`),
			get(`/analytics/sales-daily?days=${effectiveDays}${saleQs}`),
			get(`/analytics/demographics?${saleParam}`),
		])
			.then(([s, d, dm]) => {
				if (!alive) return;
				setSegments(s.data ?? []);
				setDaily(d.data ?? []);
				setDemo(dm.data ?? null);
			})
			.catch((err) => alive && setError(err?.message ?? "Failed to load analytics"))
			.finally(() => alive && setScopeLoading(false));
		return () => {
			alive = false;
		};
	}, [scopeSale, rangeDays]);

	const saleName = useMemo(
		() => Object.fromEntries([...(allSales ?? []), ...(pastSales ?? [])].map((s) => [String(saleIdOf(s)), s.name])),
		[allSales, pastSales],
	);
	const segData = useMemo(
		() =>
			(segments ?? [])
				.map((r) => ({ segment: r.segment, label: SEGMENT_LABEL[r.segment] ?? r.segment, buyers: r.buyers ?? 0 }))
				.sort((a, b) => b.buyers - a.buyers),
		[segments],
	);
	const totalBuyers = useMemo(() => segData.reduce((s, r) => s + r.buyers, 0), [segData]);
	const byKey = useMemo(() => Object.fromEntries(segData.map((r) => [r.segment, r.buyers])), [segData]);
	const groupCount = (segs) => segs.reduce((s, k) => s + (byKey[k] ?? 0), 0);

	const dailyData = useMemo(() => (daily ?? []).map((r) => ({ day: r.day, tickets: r.tickets ?? 0 })), [daily]);
	const ticketsTotal = useMemo(() => daily.reduce((s, r) => s + (r.tickets ?? 0), 0), [daily]);
	// Consolidated per-event tickets within the range (all-events view only).
	const byEvent = useMemo(() => {
		const m = new Map();
		for (const r of daily) {
			const k = String(r.sale);
			m.set(k, (m.get(k) ?? 0) + (r.tickets ?? 0));
		}
		return [...m.entries()]
			.map(([id, tickets]) => ({ id, name: saleName[id] ?? "-", tickets }))
			.sort((a, b) => b.tickets - a.tickets);
	}, [daily, saleName]);

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
	const perf = useMemo(() => {
		const sold = salesRows.reduce((s, r) => s + (r.sold ?? 0), 0);
		const cap = salesRows.reduce((s, r) => s + (r.capacity ?? 0), 0);
		const elig = salesRows.reduce((s, r) => s + (r.noShowEligible ?? 0), 0);
		const ns = salesRows.reduce((s, r) => s + (r.noShows ?? 0), 0);
		return { sellThrough: pctOf(sold, cap), noShow: pctOf(ns, elig), eligible: elig };
	}, [salesRows]);

	if (loading) return <p className="text-sm text-slate-500">Loading analytics...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const scopeName = scopeSale === "all" ? "all events" : saleName[scopeSale] ?? "event";
	const TabBtn = ({ id, label }) => (
		<button
			type="button"
			onClick={() => setTab(id)}
			className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
		>
			{label}
		</button>
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={scopeSale}
						onChange={(e) => setScopeSale(e.target.value)}
						className="max-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
					>
						<option value="all">All events</option>
						{(allSales ?? []).length > 0 && (
							<optgroup label="Live & upcoming">
								{(allSales ?? []).map((s) => (
									<option key={saleIdOf(s)} value={saleIdOf(s)}>
										{s.name}
									</option>
								))}
							</optgroup>
						)}
						{(pastSales ?? []).length > 0 && (
							<optgroup label="Past events">
								{(pastSales ?? []).map((s) => (
									<option key={saleIdOf(s)} value={saleIdOf(s)}>
										{s.name}
									</option>
								))}
							</optgroup>
						)}
					</select>
					{tab === "sales" && scopeSale === "all" && (
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
					)}
				</div>
			</div>

			<div className="flex gap-1 border-b border-slate-200 pb-px">
				<TabBtn id="audience" label="Audience" />
				<TabBtn id="sales" label="Sales" />
			</div>

			{tab === "audience" ? (
				<>
					<div className="grid grid-cols-3 gap-3">
						<Stat label="Buyers" value={totalBuyers.toLocaleString()} sub={scopeName} info={INFO.buyers} />
						<Stat label="Returning" value={`${pctOf(groupCount(["whale", "fan", "repeat"]), totalBuyers)}%`} tone="text-emerald-600" info={INFO.returning} />
						<Stat label="Win-back" value={`${winbackAgg.rate}%`} sub={`${winbackAgg.recovered}/${winbackAgg.churned}`} info={INFO.winback} />
					</div>

					<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
						{GROUPS.map((g) => {
							const n = groupCount(g.segs);
							const t = TONE[g.tone];
							return (
								<div key={g.key} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
									<div className="flex items-baseline justify-between">
										<p className="text-sm font-semibold text-slate-900">{g.label}</p>
										<p className={`text-lg font-bold ${t.text}`}>{pctOf(n, totalBuyers)}%</p>
									</div>
									<p className="mt-0.5 text-xs text-slate-500">{g.desc}</p>
									<p className="mt-2 text-xs text-slate-400">{n.toLocaleString()} buyers</p>
									<button
										type="button"
										onClick={() => exportAudience(g.segs, g.key)}
										disabled={!!exporting || n === 0}
										className={`mt-3 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${t.btn}`}
									>
										<i className="fa-solid fa-download mr-1.5" aria-hidden />
										{exporting === g.key ? "Exporting..." : g.cta}
									</button>
								</div>
							);
						})}
					</div>

					<Card
						title="Segment breakdown"
						hint={`Behavioral mix for ${scopeName}. Exports include only marketing-consented contacts.`}
					>
						{scopeLoading ? (
							<p className="text-sm text-slate-500">Loading...</p>
						) : segData.length === 0 ? (
							<p className="text-sm text-slate-500">No buyer data for {scopeName}.</p>
						) : (
							<div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
								<ResponsiveContainer width="100%" height={220}>
									<PieChart>
										<Pie data={segData} dataKey="buyers" nameKey="label" cx="50%" cy="50%" innerRadius={56} outerRadius={90} paddingAngle={2}>
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
												<Info text={SEGMENT_INFO[r.segment]} />
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

					<Card title="Demographics & location" hint={`Who your buyers are - ${scopeName}`}>
						{scopeLoading ? (
							<p className="text-sm text-slate-500">Loading...</p>
						) : (
							<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
								<Dist title="Gender" info="From buyer billing profiles." rows={demo?.gender} />
								<Dist title="Age" info="Derived from billing date of birth." rows={demo?.age} labelFn={(k) => k ?? "Unknown"} />
								<Dist
									title="Device"
									info="Parsed from the buyer's browser at purchase (User-Agent)."
									rows={demo?.device}
									empty="No device data yet."
								/>
								<Dist
									title="Top countries"
									info="From the billing address on the payment (country-level). No precise location stored."
									rows={demo?.country}
									labelFn={(k) => k ?? "Unknown"}
									empty="No location data yet."
								/>
							</div>
						)}
						{demo?.region?.length > 0 && (
							<div className="mt-5 border-t border-slate-100 pt-4">
								<Dist title="Top cities" info="From the billing address on the payment." rows={demo.region} labelFn={(k) => k ?? "Unknown"} />
							</div>
						)}
					</Card>
				</>
			) : (
				<>
					<div className="grid grid-cols-3 gap-3">
						<Stat label="Tickets sold" value={ticketsTotal.toLocaleString()} sub={scopeName} info={INFO.tickets} />
						<Stat label="Sell-through" value={`${perf.sellThrough}%`} info={INFO.sellThrough} />
						<Stat
							label="No-show"
							value={perf.eligible ? `${perf.noShow}%` : "—"}
							tone={perf.eligible && perf.noShow >= 20 ? "text-amber-600" : "text-slate-900"}
							info={perf.eligible ? NO_SHOW_INFO : `${NO_SHOW_INFO} No ended events in scope yet - pick a past event to see no-show.`}
						/>
					</div>

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

					{scopeSale === "all" && byEvent.length > 0 && (
						<Card title="By event" hint={`Tickets per event in the selected range`}>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
											<th className="py-2 pr-4">Event</th>
											<th className="py-2 text-right">Tickets</th>
										</tr>
									</thead>
									<tbody>
										{byEvent.slice(0, 30).map((r) => (
											<tr key={r.id} className="border-b border-slate-100 last:border-0">
												<td className="py-2 pr-4 font-medium text-slate-800">{r.name}</td>
												<td className="py-2 text-right text-slate-700">{r.tickets.toLocaleString()}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					)}

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
											<th className="py-2 pr-4">Sell-through</th>
											<th className="py-2 pr-4">
												No-show <Info text={NO_SHOW_INFO} />
											</th>
											<th className="py-2">Refund</th>
										</tr>
									</thead>
									<tbody>
										{salesRows.slice(0, 50).map((r) => (
											<tr key={r._id} className="border-b border-slate-100 last:border-0">
												<td className="py-2 pr-4 font-medium text-slate-800">
													<span className="inline-flex items-center gap-2">
														{r.name ?? "-"}
														<ExpiryBadge date={r.endedAt} showDate={false} warnDays={14} />
													</span>
												</td>
												<td className="py-2 pr-4 text-slate-700">{(r.sold ?? 0).toLocaleString()}</td>
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
				</>
			)}
		</div>
	);
};

export default Analytics;
