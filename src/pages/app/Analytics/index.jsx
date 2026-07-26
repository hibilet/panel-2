import dayjs from "dayjs";
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
import { Link, useLocation } from "wouter";
import { useApp } from "../../../context";
import { ExpiryBadge, Info } from "../../../components/shared";
import { countryName } from "../../../lib/countries";
import { get, getText } from "../../../lib/client";
import { showToast } from "../../../lib/toastStore";
import { formatCurrency } from "../../../localization";

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
// Rolling windows back from today, in days. YTD is days since Jan 1. Custom
// ranges need start/end support in the analytics endpoints (not yet).
const ytdDays = () => dayjs().diff(dayjs().startOf("year"), "day") + 1;
const RANGES = [
	{ label: "1d", days: 1 },
	{ label: "1w", days: 7 },
	{ label: "1m", days: 30 },
	{ label: "3m", days: 90 },
	{ label: "6m", days: 180 },
	{ label: "YTD", days: ytdDays() },
	{ label: "1y", days: 365 },
	{ label: "All", days: 1825 },
];

const pctOf = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const saleIdOf = (s) => s.id ?? s._id;
const PAYMENT_LABEL = {
	paypal: "PayPal", klarna: "Klarna", apple_pay: "Apple Pay", google_pay: "Google Pay",
	card: "Card", ideal: "iDEAL", link: "Link", twint: "TWINT", bancontact: "Bancontact",
	amazon_pay: "Amazon Pay", eps: "EPS", sofort: "Sofort", giropay: "giropay",
};
const paymentLabel = (k) => PAYMENT_LABEL[k] ?? (k ? k.replace(/_/g, " ") : "Unknown");
// "base-sale" is the auto-created default channel = direct / organizer website.
const channelLabel = (name) => (name === "base-sale" ? "Direct / website" : name ?? "-");

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
// When onPick is given, rows are clickable (cross-filter); activeKey highlights.
const Dist = ({ title, info, rows, labelFn = titleCase, empty, onPick, activeKey, max }) => {
	const total = (rows ?? []).reduce((s, r) => s + r.count, 0);
	const Row = onPick ? "button" : "div";
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
					{rows.slice(0, max ?? 8).map((r) => {
						const active = onPick && activeKey === r.key;
						return (
							<Row
								key={r.key ?? "na"}
								type={onPick ? "button" : undefined}
								onClick={onPick ? () => onPick(r.key) : undefined}
								className={`block w-full text-left ${onPick ? "cursor-pointer rounded-md px-1 py-0.5 transition hover:bg-slate-50" : ""} ${active ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}
							>
								<div className="flex justify-between text-[11px] text-slate-600">
									<span className="truncate pr-2">{labelFn(r.key)}</span>
									<span className="shrink-0 tabular-nums">{r.count.toLocaleString()} · {pctOf(r.count, total)}%</span>
								</div>
								<div className="mt-0.5 h-1.5 rounded bg-slate-100">
									<div className={`h-1.5 rounded ${active ? "bg-blue-700" : "bg-blue-500"}`} style={{ width: `${pctOf(r.count, total)}%` }} />
								</div>
							</Row>
						);
					})}
				</div>
			)}
		</div>
	);
};

// Axis labels only: "1.2k" beats "€1,234.00" in a 56px gutter.
const compactAmount = (v) =>
	Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v));

const aggregate = (rows) =>
	(rows ?? []).reduce(
		(a, r) => ({
			tickets: a.tickets + (r.tickets ?? 0),
			gross: a.gross + (r.grossCents ?? 0),
			net: a.net + (r.netCents ?? 0),
			refunded: a.refunded + (r.refundedCents ?? 0),
			refundedCount: a.refundedCount + (r.refundedCount ?? 0),
		}),
		{ tickets: 0, gross: 0, net: 0, refunded: 0, refundedCount: 0 },
	);

// Period-over-period chip. Hidden when there is no comparable prior period.
// `invert` marks metrics where a rise is bad (refunds).
const Delta = ({ current, previous, invert }) => {
	if (previous == null || previous === 0) return null;
	const pct = Math.round(((current - previous) / previous) * 100);
	if (pct === 0) return <span className="text-[11px] text-slate-400">no change</span>;
	const up = pct > 0;
	const good = invert ? !up : up;
	return (
		<span
			className={`inline-flex items-center gap-1 text-[11px] font-medium ${good ? "text-emerald-600" : "text-red-600"}`}
			title="vs the preceding period of the same length"
		>
			<i className={`fa-solid ${up ? "fa-arrow-up" : "fa-arrow-down"}`} aria-hidden />
			{Math.abs(pct)}%
		</span>
	);
};

const Stat = ({ label, value, sub, tone, info, delta }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
			{label}
			<Info text={info} />
		</p>
		<p className={`mt-0.5 text-xl font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
		<div className="mt-0.5 flex flex-wrap items-center gap-2">
			{sub && <p className="text-xs text-slate-500">{sub}</p>}
			{delta}
		</div>
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
	net: "Gross sales minus discounts, as settled by the payment provider. Refunds are shown separately.",
	avgTicket: "Net revenue divided by tickets sold in scope.",
	refunded: "Money returned to buyers in scope.",
	segment: "Behavioral group derived from purchase history and checkout journey.",
};

const TABS = ["audience", "sales", "marketing"];
const TAB_LABEL = { audience: "Audience", sales: "Sales", marketing: "Marketing" };

const TabBtn = ({ id, active, onSelect }) => (
	<button
		type="button"
		role="tab"
		aria-selected={active}
		aria-controls={`analytics-panel-${id}`}
		onClick={() => onSelect(id)}
		className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
	>
		{TAB_LABEL[id]}
	</button>
);

const Analytics = () => {
	const { sales: allSales } = useApp();
	const [, setLocation] = useLocation();
	// Tab / scope / range live in the URL so a view can be bookmarked, shared
	// and survives a refresh.
	const initial = useMemo(() => {
		const q = new URLSearchParams(window.location.search);
		const t = q.get("tab");
		const d = Number(q.get("days"));
		const saleParam = q.get("sale");
		return {
			tab: TABS.includes(t) ? t : "audience",
			// Comma-separated ids; empty array = all events.
			scope: saleParam ? saleParam.split(",").filter(Boolean) : [],
			days: RANGES.some((r) => r.days === d) ? d : 365,
			start: q.get("start") ?? "",
			end: q.get("end") ?? "",
		};
	}, []);
	const [tab, setTab] = useState(initial.tab);
	const [scopeSales, setScopeSales] = useState(initial.scope);
	const [rangeDays, setRangeDays] = useState(initial.days);
	// When both are set, a custom date range overrides the rolling `days`.
	const [customStart, setCustomStart] = useState(initial.start);
	const [customEnd, setCustomEnd] = useState(initial.end);
	const [saleSearch, setSaleSearch] = useState("");
	const [salePickerOpen, setSalePickerOpen] = useState(false);
	const [customOpen, setCustomOpen] = useState(Boolean(initial.start && initial.end));
	const [trendMetric, setTrendMetric] = useState("tickets");
	const [selCountry, setSelCountry] = useState(null);

	const isCustomRange = Boolean(customStart && customEnd);
	// Serialised sale scope for query strings + effect deps.
	const saleCsv = scopeSales.join(",");

	useEffect(() => {
		const q = new URLSearchParams();
		if (tab !== "audience") q.set("tab", tab);
		if (saleCsv) q.set("sale", saleCsv);
		if (isCustomRange) {
			q.set("start", customStart);
			q.set("end", customEnd);
		} else if (rangeDays !== 365) {
			q.set("days", String(rangeDays));
		}
		const qs = q.toString();
		setLocation(`/analytics${qs ? `?${qs}` : ""}`, { replace: true });
	}, [tab, saleCsv, rangeDays, isCustomRange, customStart, customEnd, setLocation]);

	const [pastSales, setPastSales] = useState([]);
	const [segments, setSegments] = useState([]);
	const [demo, setDemo] = useState(null);
	const [payments, setPayments] = useState([]);
	const [winback, setWinback] = useState([]);
	const [daily, setDaily] = useState([]);
	const [salesPerf, setSalesPerf] = useState([]);
	const [channels, setChannels] = useState([]);
	const [coupons, setCoupons] = useState([]);
	const [timing, setTiming] = useState([]);
	const [affinity, setAffinity] = useState({ pairs: [], related: [] });
	const [friction, setFriction] = useState(null);
	const [events, setEvents] = useState([]);
	const [engagement, setEngagement] = useState(null);
	const [demoFilter, setDemoFilter] = useState({});
	const [loading, setLoading] = useState(true);
	const [scopeLoading, setScopeLoading] = useState(false);
	const [demoLoading, setDemoLoading] = useState(false);
	const [error, setError] = useState(null);
	const [exporting, setExporting] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	// segs: array (group) or string (single). name: download/toast label.
	const exportAudience = async (segs, name) => {
		const key = name ?? (Array.isArray(segs) ? segs.join(",") : segs ?? "all");
		setExporting(key);
		try {
			const params = new URLSearchParams({ type: "segment" });
			if (Array.isArray(segs)) params.set("segments", segs.join(","));
			else if (segs) params.set("segment", segs);
			if (saleCsv) params.set("sale", saleCsv);
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
				setError(null);
			} catch (err) {
				if (alive) setError(err?.message ?? "Failed to load analytics");
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [reloadKey]);

	useEffect(() => {
		let alive = true;
		setScopeLoading(true);
		// A single event shows its FULL on-sale lifetime (start->end), not a
		// rolling window - so pull wide and let the event's days define the span.
		// For all-events we pull double the range so the preceding period is
		// available for the period-over-period deltas.
		const scoped = scopeSales.length > 0;
		const effectiveDays = scoped ? 1825 : Math.min(rangeDays * 2, 1825);
		const saleParam = scoped ? `sale=${saleCsv}` : "";
		// Custom range wins on the daily trend; otherwise a rolling window.
		const dailyRange = isCustomRange
			? `start=${customStart}&end=${customEnd}`
			: `days=${effectiveDays}`;
		const saleQs = scoped ? `&sale=${saleCsv}` : "";
		Promise.all([
			get(`/analytics/segments?${saleParam}`),
			get(`/analytics/sales-daily?${dailyRange}${saleQs}`),
			get(`/analytics/channels?${saleParam}`),
			get(`/analytics/coupons?${saleParam}`),
			get(`/analytics/timing?${saleParam}`),
			get(`/analytics/affinity?${saleParam}`),
			get(`/analytics/friction?${saleParam}`),
			get(`/analytics/engagement?${saleParam}`),
			get(`/analytics/events?${saleParam}`),
		])
			.then(([s, d, ch, co, tm, af, fr, en, ev]) => {
				if (!alive) return;
				setSegments(s.data ?? []);
				setDaily(d.data ?? []);
				setChannels(ch.data ?? []);
				setCoupons(co.data ?? []);
				setTiming(tm.data ?? []);
				setAffinity(af.data ?? { pairs: [], related: [] });
				setFriction(fr.data ?? null);
				setEngagement(en.data ?? null);
				setEvents(ev.data ?? []);
				setSelCountry(null);
				setDemoFilter({});
			})
			.catch((err) => alive && setError(err?.message ?? "Failed to load analytics"))
			.finally(() => alive && setScopeLoading(false));
		return () => {
			alive = false;
		};
	}, [saleCsv, rangeDays, isCustomRange, customStart, customEnd, reloadKey]);

	// Demographics + payment method share one fetch so cross-filtering
	// (gender/age/device/payment) re-queries just this block, not the whole
	// page. Payment method lives on transactions rather than the buyer fact,
	// so it is a separate endpoint that takes the same filter params.
	useEffect(() => {
		let alive = true;
		setDemoLoading(true);
		const p = new URLSearchParams();
		if (saleCsv) p.set("sale", saleCsv);
		for (const [k, v] of Object.entries(demoFilter)) if (v) p.set(k, v);
		// The payment breakdown must not filter itself out of existence.
		const pp = new URLSearchParams(p);
		pp.delete("payment");
		Promise.all([
			get(`/analytics/demographics?${p}`),
			get(`/analytics/payments?${pp}`),
		])
			.then(([dm, pm]) => {
				if (!alive) return;
				setDemo(dm.data ?? null);
				setPayments(pm.data ?? []);
			})
			.catch(() => {})
			.finally(() => alive && setDemoLoading(false));
		return () => {
			alive = false;
		};
	}, [saleCsv, demoFilter]);

	const saleName = useMemo(
		() => Object.fromEntries([...(allSales ?? []), ...(pastSales ?? [])].map((s) => [String(saleIdOf(s)), s.name])),
		[allSales, pastSales],
	);
	// /analytics/segments returns one row per merchant per segment (the fact
	// is keyed `${merchant}:${segment}`), so an admin scoped to a realm gets
	// the same segment back once per merchant. Fold them before rendering -
	// otherwise the list repeats and byKey below silently keeps only the last
	// row of each segment, undercounting the group percentages.
	const segData = useMemo(() => {
		const m = new Map();
		for (const r of segments ?? []) {
			if (!r?.segment) continue;
			m.set(r.segment, (m.get(r.segment) ?? 0) + (r.buyers ?? 0));
		}
		return [...m.entries()]
			.map(([segment, buyers]) => ({
				segment,
				label: SEGMENT_LABEL[segment] ?? segment,
				buyers,
			}))
			.sort((a, b) => b.buyers - a.buyers);
	}, [segments]);
	const totalBuyers = useMemo(() => segData.reduce((s, r) => s + r.buyers, 0), [segData]);
	const byKey = useMemo(() => Object.fromEntries(segData.map((r) => [r.segment, r.buyers])), [segData]);
	const groupCount = (segs) => segs.reduce((s, k) => s + (byKey[k] ?? 0), 0);

	const totalCountryBuyers = useMemo(
		() => (demo?.country ?? []).reduce((s, c) => s + c.count, 0),
		[demo],
	);
	const activeCountry = selCountry ?? demo?.country?.[0]?.key ?? null;
	const hasDeviceData = (demo?.device ?? []).some((d) => d.key && d.key !== "unknown");
	const pick = (dim) => (key) => setDemoFilter((f) => ({ ...f, [dim]: f[dim] === key ? undefined : key }));
	const activeFilters = Object.entries(demoFilter).filter(([, v]) => v);
	const FILTER_LABEL = { gender: "Gender", age: "Age", device: "Device", payment: "Payment" };
	const citiesOfActive = useMemo(
		() => (demo?.cities ?? []).filter((c) => c.country === activeCountry),
		[demo, activeCountry],
	);

	const timingMatrix = useMemo(() => {
		const m = {};
		let max = 1;
		for (const t of timing) {
			m[`${t.dow}-${t.hour}`] = t.count;
			if (t.count > max) max = t.count;
		}
		return { m, max };
	}, [timing]);

	// A single event is always shown over its full lifetime, so there is no
	// preceding period to compare against; all-events splits the pulled window
	// in half at `today - rangeDays`.
	const isScoped = scopeSales.length > 0;
	const { curRows, prevRows } = useMemo(() => {
		const rows = daily ?? [];
		if (isScoped) return { curRows: rows, prevRows: [] };
		const cutoff = dayjs().subtract(rangeDays, "day").format("YYYY-MM-DD");
		return {
			curRows: rows.filter((r) => r.day >= cutoff),
			prevRows: rows.filter((r) => r.day < cutoff),
		};
	}, [daily, rangeDays, isScoped]);

	const currency = useMemo(
		() => (daily ?? []).find((r) => r.currency)?.currency ?? "eur",
		[daily],
	);
	const cur = useMemo(() => aggregate(curRows), [curRows]);
	const prev = useMemo(() => aggregate(prevRows), [prevRows]);
	const hasPrev = !isScoped && prevRows.length > 0;

	const dailyData = useMemo(
		() =>
			curRows.map((r) => ({
				day: r.day,
				tickets: r.tickets ?? 0,
				revenue: (r.netCents ?? 0) / 100,
			})),
		[curRows],
	);
	const ticketsTotal = cur.tickets;
	const isRevenue = trendMetric === "revenue";
	// Consolidated per-event tickets + revenue within the range (all-events view).
	const byEvent = useMemo(() => {
		const m = new Map();
		for (const r of curRows) {
			const k = String(r.sale);
			const e = m.get(k) ?? { tickets: 0, net: 0, refunded: 0 };
			e.tickets += r.tickets ?? 0;
			e.net += r.netCents ?? 0;
			e.refunded += r.refundedCents ?? 0;
			m.set(k, e);
		}
		return [...m.entries()]
			.map(([id, v]) => ({ id, name: saleName[id] ?? "-", ...v }))
			.sort((a, b) => b.net - a.net || b.tickets - a.tickets);
	}, [curRows, saleName]);

	const winbackRows = useMemo(
		() =>
			scopeSales.length === 0
				? winback
				: winback.filter((r) => scopeSales.includes(String(r.sale))),
		[winback, scopeSales],
	);
	const salesRows = useMemo(
		() =>
			scopeSales.length === 0
				? salesPerf
				: salesPerf.filter((r) => scopeSales.includes(String(r._id))),
		[salesPerf, scopeSales],
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

	if (loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="h-8 w-40 animate-shimmer rounded" />
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{[0, 1, 2].map((i) => (
						<div key={i} className="h-20 animate-shimmer rounded-xl" />
					))}
				</div>
				<div className="h-64 animate-shimmer rounded-xl" />
				<div className="h-64 animate-shimmer rounded-xl" />
			</div>
		);
	}

	const scopeName =
		scopeSales.length === 0
			? "all events"
			: scopeSales.length === 1
				? saleName[scopeSales[0]] ?? "event"
				: `${scopeSales.length} events`;
	const hasAffinity = (affinity.pairs?.length ?? 0) > 0 || (affinity.related?.length ?? 0) > 0;
	const crossSellCard = (
		<Card
			title="Also bought (cross-sell)"
			hint={
				scopeSales.length === 0
					? "Event pairs bought by the same customers - co-purchase across all events. Market one to the other's buyers."
					: `Events that ${scopeName} buyers also bought - promote these to them.`
			}
		>
			{scopeSales.length > 0 ? (
				<div className="space-y-1.5">
					{(affinity.related ?? []).map((a) => (
						<div key={a.sale}>
							<div className="flex justify-between text-xs text-slate-600">
								<span className="truncate pr-2 font-medium">{a.name}</span>
								<span className="shrink-0 tabular-nums">{a.buyers.toLocaleString()} · {a.sharePct}%</span>
							</div>
							<div className="mt-0.5 h-1.5 rounded bg-slate-100">
								<div className="h-1.5 rounded bg-violet-500" style={{ width: `${a.sharePct}%` }} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="space-y-2">
					{(affinity.pairs ?? []).map((p, i) => (
						<div key={`${p.a}-${p.b}-${i}`} className="flex items-center gap-2 text-xs">
							<span className="flex min-w-0 flex-1 items-center gap-1.5">
								<span className="truncate font-medium text-slate-700">{p.a}</span>
								<i className="fa-solid fa-arrows-left-right shrink-0 text-slate-400" aria-hidden />
								<span className="truncate font-medium text-slate-700">{p.b}</span>
							</span>
							<span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
								{p.buyers.toLocaleString()} shared
							</span>
						</div>
					))}
				</div>
			)}
		</Card>
	);
	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
				<div className="flex flex-wrap items-center gap-2">
					{/* Multi-select event scope: search + tick several events; the
					    analytics rebuild as the selection changes. */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setSalePickerOpen((o) => !o)}
							className="inline-flex max-w-[240px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
						>
							<i className="fa-solid fa-filter text-slate-400" aria-hidden />
							<span className="truncate">{scopeName}</span>
							<i className="fa-solid fa-chevron-down text-xs text-slate-400" aria-hidden />
						</button>
						{salePickerOpen && (
							<div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
								<div className="border-b border-slate-100 p-2">
									<input
										type="text"
										value={saleSearch}
										onChange={(e) => setSaleSearch(e.target.value)}
										placeholder="Search events…"
										className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
									/>
								</div>
								<div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-500">
									<span>{scopeSales.length ? `${scopeSales.length} selected` : "All events"}</span>
									{scopeSales.length > 0 && (
										<button type="button" onClick={() => setScopeSales([])} className="font-medium text-slate-600 hover:text-slate-900">
											Clear
										</button>
									)}
								</div>
								<div className="max-h-64 overflow-y-auto pb-1">
									{[...(allSales ?? []), ...(pastSales ?? [])]
										.filter((s) => !saleSearch || (s.name ?? "").toLowerCase().includes(saleSearch.toLowerCase()))
										.map((s) => {
											const id = String(saleIdOf(s));
											const on = scopeSales.includes(id);
											return (
												<label key={id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
													<input
														type="checkbox"
														checked={on}
														onChange={() =>
															setScopeSales((prev) =>
																on ? prev.filter((x) => x !== id) : [...prev, id],
															)
														}
														className="h-4 w-4 rounded border-slate-300"
													/>
													<span className="truncate">{s.name}</span>
												</label>
											);
										})}
								</div>
							</div>
						)}
					</div>

					{/* Timeframe: rolling presets on every tab, plus a custom range. */}
					<div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
						{RANGES.map((r) => (
							<button
								key={r.days}
								type="button"
								onClick={() => {
									setCustomOpen(false);
									setCustomStart("");
									setCustomEnd("");
									setRangeDays(r.days);
								}}
								className={`px-2.5 py-1.5 text-xs font-medium ${rangeDays === r.days && !isCustomRange ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
							>
								{r.label}
							</button>
						))}
						<button
							type="button"
							onClick={() => setCustomOpen((o) => !o)}
							className={`px-2.5 py-1.5 text-xs font-medium ${isCustomRange || customOpen ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
						>
							Custom
						</button>
					</div>
					{customOpen && (
						<span className="inline-flex items-center gap-1 text-sm">
							<input
								type="date"
								value={customStart}
								max={customEnd || undefined}
								onChange={(e) => setCustomStart(e.target.value)}
								className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
							/>
							<span className="text-slate-400">→</span>
							<input
								type="date"
								value={customEnd}
								min={customStart || undefined}
								onChange={(e) => setCustomEnd(e.target.value)}
								className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
							/>
						</span>
					)}
				</div>
			</div>

			{error && (
				<div
					className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
					role="alert"
				>
					<span>{error}</span>
					<button
						type="button"
						onClick={() => setReloadKey((k) => k + 1)}
						className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
					>
						Retry
					</button>
				</div>
			)}

			<div role="tablist" aria-label="Analytics sections" className="flex gap-1">
				{TABS.map((id) => (
					<TabBtn key={id} id={id} active={tab === id} onSelect={setTab} />
				))}
			</div>

			{tab === "audience" && (
				<div id="analytics-panel-audience" role="tabpanel" className="space-y-6">
					{hasAffinity && crossSellCard}
					{engagement && engagement.visitors > 0 && (
						<Card
							title="Audience engagement"
							hint="Widget visitors recognised across events - the basis for cross-sell and win-back"
						>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<div className="text-xl font-semibold text-slate-900">{engagement.visitors.toLocaleString()}</div>
									<div className="text-xs text-slate-500">Visitors</div>
								</div>
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<div className="text-xl font-semibold text-emerald-700">{engagement.returningRatePct}%</div>
									<div className="text-xs text-slate-500">Browsed multiple events</div>
								</div>
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<div className="text-xl font-semibold text-slate-900">{engagement.identified.toLocaleString()}</div>
									<div className="text-xs text-slate-500">Identified (bought)</div>
								</div>
							</div>
							{engagement.crossSell?.length > 0 && (
								<div className="mt-4">
									<div className="mb-1 text-xs font-medium text-slate-500">
										Your buyers also browsed
									</div>
									<ul className="divide-y divide-slate-100">
										{engagement.crossSell.slice(0, 6).map((c) => (
											<li key={c._id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
												<span className="min-w-0 truncate text-slate-700">{c.sale || "—"}</span>
												<span className="shrink-0 font-semibold text-slate-900">{c.visitors}</span>
											</li>
										))}
									</ul>
								</div>
							)}
						</Card>
					)}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

					<Card
						title="Demographics & payment"
						hint={`Who your buyers are - ${scopeName}. Click a gender / age / device / payment method to filter the rest.`}
						action={
							activeFilters.length > 0 && (
								<button
									type="button"
									onClick={() => setDemoFilter({})}
									className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
								>
									Clear filters
								</button>
							)
						}
					>
						{scopeLoading || demoLoading ? (
							<p className="text-sm text-slate-500">Loading...</p>
						) : (
							<>
								{activeFilters.length > 0 && (
									<div className="mb-3 flex flex-wrap gap-2">
										{activeFilters.map(([dim, val]) => (
											<button
												type="button"
												key={dim}
												onClick={() => pick(dim)(val)}
												className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-800"
											>
												{FILTER_LABEL[dim] ?? dim}:{" "}
												{dim === "age" ? val : dim === "payment" ? paymentLabel(val) : titleCase(val)}
												<i className="fa-solid fa-xmark" aria-hidden />
											</button>
										))}
									</div>
								)}
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
									<Dist title="Gender" info="From buyer billing profiles (your data). Click to filter." rows={demo?.gender} onPick={pick("gender")} activeKey={demoFilter.gender} />
									<Dist title="Age" info="Derived from billing date of birth (your data). Click to filter." rows={demo?.age} labelFn={(k) => k ?? "Unknown"} onPick={pick("age")} activeKey={demoFilter.age} />
									{hasDeviceData && (
										<Dist
											title="Device"
											info="From the buyer's browser at purchase (User-Agent). Stripe does not expose device; this is from your own logs."
											rows={demo?.device}
											onPick={pick("device")}
											activeKey={demoFilter.device}
										/>
									)}
									<Dist
										title="Payment method"
										info="What buyers paid with - card, PayPal, Klarna, Apple/Google Pay... from the provider. Click to filter."
										rows={payments}
										labelFn={paymentLabel}
										empty="No payment data yet."
										onPick={pick("payment")}
										activeKey={demoFilter.payment}
									/>
								</div>
								<p className="mt-4 text-[11px] text-slate-400">
									Note: not every purchaser has billing or location info from the payment provider -
									gender/age come from your own profiles, location + payment method from the provider
									where available. Percentages are of buyers where the field exists.
								</p>
							</>
						)}
					</Card>

					<Card
						title="Where your buyers are"
						hint="From the billing address on the payment (country + city). Select a country to see its cities."
					>
						{scopeLoading || demoLoading ? (
							<p className="text-sm text-slate-500">Loading...</p>
						) : (demo?.country ?? []).length === 0 ? (
							<p className="text-sm text-slate-500">No location data yet.</p>
						) : (
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								{/* Countries - clickable to filter cities */}
								<div>
									<p className="mb-2 text-xs font-semibold text-slate-700">Countries</p>
									<div className="max-h-72 space-y-1 overflow-y-auto pr-1">
										{(demo.country ?? []).map((c) => {
											const tot = totalCountryBuyers;
											const isSel = c.key === activeCountry;
											return (
												<button
													type="button"
													key={c.key}
													onClick={() => setSelCountry(c.key)}
													className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${isSel ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}
												>
													<span className="font-medium text-slate-700">{countryName(c.key)}</span>
													<span className="shrink-0 tabular-nums text-slate-500">{c.count.toLocaleString()} · {pctOf(c.count, tot)}%</span>
												</button>
											);
										})}
									</div>
								</div>
								{/* Cities of the selected country */}
								<div>
									<p className="mb-2 flex items-center text-xs font-semibold text-slate-700">
										Cities in {countryName(activeCountry)}
										<Info text="Buyer cities for the selected country, from the billing address." />
									</p>
									{citiesOfActive.length === 0 ? (
										<p className="text-xs text-slate-400">No city detail for this country.</p>
									) : (
										<div className="space-y-1.5">
											{citiesOfActive.slice(0, 15).map((c) => {
												const tot = citiesOfActive.reduce((s, x) => s + x.count, 0);
												return (
													<div key={c.key}>
														<div className="flex justify-between text-[11px] text-slate-600">
															<span className="truncate pr-2">{c.key}</span>
															<span className="shrink-0 tabular-nums">{c.count.toLocaleString()} · {pctOf(c.count, tot)}%</span>
														</div>
														<div className="mt-0.5 h-1.5 rounded bg-slate-100">
															<div className="h-1.5 rounded bg-blue-500" style={{ width: `${pctOf(c.count, tot)}%` }} />
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</div>
						)}
						{(demo?.country ?? []).length > 0 && (
							<p className="mt-4 text-[11px] text-slate-400">
								Note: not every purchaser has billing or location info from the payment provider.
								Location is shown only for buyers where the provider supplied a billing address;
								percentages are of those buyers.
							</p>
						)}
					</Card>
				</div>
			)}

			{tab === "sales" && (
				<div id="analytics-panel-sales" role="tabpanel" className="space-y-6">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<Stat
							label="Tickets sold"
							value={ticketsTotal.toLocaleString()}
							sub={scopeName}
							info={INFO.tickets}
							delta={hasPrev && <Delta current={cur.tickets} previous={prev.tickets} />}
						/>
						<Stat
							label="Net revenue"
							value={formatCurrency(cur.net / 100, currency)}
							info={INFO.net}
							delta={hasPrev && <Delta current={cur.net} previous={prev.net} />}
						/>
						<Stat
							label="Avg ticket"
							value={cur.tickets ? formatCurrency(cur.net / 100 / cur.tickets, currency) : "—"}
							info={INFO.avgTicket}
						/>
						<Stat
							label="Refunded"
							value={formatCurrency(cur.refunded / 100, currency)}
							tone={cur.refunded > 0 ? "text-red-600" : "text-slate-900"}
							sub={cur.refundedCount ? `${cur.refundedCount.toLocaleString()} tickets` : undefined}
							info={INFO.refunded}
							delta={hasPrev && <Delta current={cur.refunded} previous={prev.refunded} invert />}
						/>
						<Stat label="Sell-through" value={`${perf.sellThrough}%`} info={INFO.sellThrough} />
						<Stat
							label="No-show"
							value={perf.eligible ? `${perf.noShow}%` : "—"}
							tone={perf.eligible && perf.noShow >= 20 ? "text-amber-600" : "text-slate-900"}
							info={perf.eligible ? NO_SHOW_INFO : `${NO_SHOW_INFO} No ended events in scope yet - pick a past event to see no-show.`}
						/>
					</div>
					{hasPrev && (
						<p className="-mt-3 text-[11px] text-slate-400">
							Arrows compare the last {rangeDays} days with the {rangeDays} days before them.
						</p>
					)}

					{friction && friction.multiAttemptBaskets > 0 && (
						<Card
							title="Checkout friction"
							hint="Buyers who needed more than one payment attempt - a high rate means a payment-UX problem"
						>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<div className="text-xl font-semibold text-slate-900">{friction.frictionRatePct}%</div>
									<div className="text-xs text-slate-500">Retry rate ({friction.multiAttemptBaskets} of {friction.totalBaskets})</div>
								</div>
								<div className="rounded-lg border border-red-200 bg-red-50 p-3">
									<div className="text-xl font-semibold text-red-600">{friction.lostToFrictionBaskets}</div>
									<div className="text-xs text-slate-500">Lost after retries</div>
								</div>
								<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
									<div className="text-xl font-semibold text-emerald-700">{friction.recoveredBaskets}</div>
									<div className="text-xs text-slate-500">Recovered (bought anyway)</div>
								</div>
								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
									<div className="text-xl font-semibold text-slate-900">{friction.avgAttemptsToConvert}</div>
									<div className="text-xs text-slate-500">Avg attempts to convert</div>
								</div>
							</div>
							{friction.top?.length > 0 && (
								<div className="mt-4">
									<div className="mb-1 text-xs font-medium text-slate-500">Most-retried checkouts</div>
									<ul className="divide-y divide-slate-100">
										{friction.top.slice(0, 8).map((r) => (
											<li key={r._id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
												<span className="min-w-0 truncate text-slate-700">{r.email || "—"}</span>
												<span className="flex shrink-0 items-center gap-2">
													<span className="font-semibold text-slate-900">{r.attempts}×</span>
													<span className={`rounded px-1.5 py-0.5 text-xs ${r.converted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
														{r.converted ? "bought" : "lost"}
													</span>
												</span>
											</li>
										))}
									</ul>
								</div>
							)}
						</Card>
					)}

					<Card
						title="Sales trend"
						hint={`${isRevenue ? "Net revenue" : "Tickets"} per day - ${scopeName}`}
						action={
							<div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-300">
								{[
									{ id: "tickets", label: "Tickets" },
									{ id: "revenue", label: "Revenue" },
								].map((m) => (
									<button
										key={m.id}
										type="button"
										onClick={() => setTrendMetric(m.id)}
										aria-pressed={trendMetric === m.id}
										className={`px-2.5 py-1.5 text-xs font-medium ${trendMetric === m.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
									>
										{m.label}
									</button>
								))}
							</div>
						}
					>
						{scopeLoading ? (
							<div className="h-[260px] animate-shimmer rounded-lg" />
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
										<linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
											<stop offset="100%" stopColor="#059669" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={32} />
									<YAxis
										tick={{ fontSize: 11 }}
										width={isRevenue ? 56 : 40}
										allowDecimals={false}
										tickFormatter={(v) => (isRevenue ? compactAmount(v) : v)}
									/>
									<Tooltip
										formatter={(v) => [
											isRevenue ? formatCurrency(Number(v), currency) : Number(v).toLocaleString(),
											isRevenue ? "Net revenue" : "Tickets",
										]}
									/>
									<Area
										type="monotone"
										dataKey={isRevenue ? "revenue" : "tickets"}
										stroke={isRevenue ? "#059669" : "#2563eb"}
										fill={isRevenue ? "url(#rv)" : "url(#tk)"}
										strokeWidth={2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</Card>

					{scopeSales.length === 0 && byEvent.length > 0 && (
						<Card
							title="By event"
							hint="Tickets and net revenue per event in the selected range. Click an event to open it."
						>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[420px] text-sm">
									<thead>
										<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
											<th className="py-2 pr-4">Event</th>
											<th className="py-2 pr-4 text-right">Tickets</th>
											<th className="py-2 pr-4 text-right">Net revenue</th>
											<th className="py-2 text-right">Refunded</th>
										</tr>
									</thead>
									<tbody>
										{byEvent.slice(0, 30).map((r) => (
											<tr key={r.id} className="border-b border-slate-100 last:border-0">
												<td className="py-2 pr-4 font-medium text-slate-800">
													<Link href={`/sales/${r.id}`} className="hover:text-blue-700 hover:underline">
														{r.name}
													</Link>
												</td>
												<td className="py-2 pr-4 text-right tabular-nums text-slate-700">{r.tickets.toLocaleString()}</td>
												<td className="py-2 pr-4 text-right tabular-nums font-medium text-slate-800">
													{formatCurrency(r.net / 100, currency)}
												</td>
												<td className="py-2 text-right tabular-nums text-slate-500">
													{r.refunded ? formatCurrency(r.refunded / 100, currency) : "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{byEvent.length > 30 && (
								<p className="mt-2 text-[11px] text-slate-400">
									Showing the top 30 of {byEvent.length} events by revenue.
								</p>
							)}
						</Card>
					)}

					<Card title="Sales performance" hint="Sell-through, no-show and refund rate per event">
						{salesRows.length === 0 ? (
							<p className="text-sm text-slate-500">No sales yet.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[480px] text-sm">
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
														<Link href={`/sales/${r._id}`} className="hover:text-blue-700 hover:underline">
															{r.name ?? "-"}
														</Link>
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
								<table className="w-full min-w-[480px] text-sm">
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

					<Card title="Purchase timing" hint="When buyers check out (Berlin time). Darker = more baskets - use it to time announcements.">
						{timing.length === 0 ? (
							<p className="text-sm text-slate-500">No data yet.</p>
						) : (
							<div className="overflow-x-auto">
								<div className="min-w-[560px]">
									<div className="flex">
										<div className="w-10 shrink-0" />
										{Array.from({ length: 24 }, (_, h) => (
											<div key={h} className="flex-1 text-center text-[9px] text-slate-400">
												{h % 3 === 0 ? h : ""}
											</div>
										))}
									</div>
									{[2, 3, 4, 5, 6, 7, 1].map((dow) => (
										<div key={dow} className="flex items-center">
											<div className="w-10 shrink-0 text-[10px] font-medium text-slate-500">
												{["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]}
											</div>
											{Array.from({ length: 24 }, (_, h) => {
												const c = timingMatrix.m[`${dow}-${h}`] ?? 0;
												const t = c / timingMatrix.max;
												return (
													<div key={h} className="flex-1 px-px">
														<div
															className="h-4 rounded-sm"
															title={`${["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]} ${h}:00 - ${c} baskets`}
															style={{ background: c ? `rgba(37,99,235,${0.12 + 0.88 * t})` : "#f1f5f9" }}
														/>
													</div>
												);
											})}
										</div>
									))}
								</div>
							</div>
						)}
					</Card>
				</div>
			)}

			{tab === "marketing" && (
				<div id="analytics-panel-marketing" role="tabpanel" className="space-y-6">
					<Card title="Events funnel" hint="Per event: views → baskets → sales, with the revenue that converted, the revenue lost to abandoned baskets, and the two conversion rates.">
						{events.length === 0 ? (
							<p className="text-sm text-slate-500">No events in range.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[720px] text-sm">
									<thead>
										<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
											<th className="py-2 pr-4">Event</th>
											<th className="py-2 pr-4 text-right">Views</th>
											<th className="py-2 pr-4 text-right">Baskets</th>
											<th className="py-2 pr-4 text-right">Sales</th>
											<th className="py-2 pr-4 text-right">Gross rev.</th>
											<th className="py-2 pr-4 text-right">Lost sales</th>
											<th className="py-2 pr-4 text-right">Lost rev.</th>
											<th className="py-2 pr-4 text-right">View→Basket</th>
											<th className="py-2 text-right">Basket→Sale</th>
										</tr>
									</thead>
									<tbody>
										{events.map((r) => (
											<tr key={r.sale} className="border-b border-slate-100 last:border-0">
												<td className="max-w-[240px] truncate py-2 pr-4 font-medium text-slate-800" title={r.name}>{r.name}</td>
												<td className="py-2 pr-4 text-right tabular-nums">{(r.views ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-right tabular-nums">{(r.baskets ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-right tabular-nums">{(r.sales ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(r.grossRev ?? 0, r.currency)}</td>
												<td className="py-2 pr-4 text-right tabular-nums text-red-600">{(r.lostSales ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-right tabular-nums text-red-600">{formatCurrency(r.lostRev ?? 0, r.currency)}</td>
												<td className="py-2 pr-4 text-right tabular-nums">{r.viewToBasketPct ?? 0}%</td>
												<td className="py-2 text-right tabular-nums">{r.basketToSalePct ?? 0}%</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>

					<Card title="Channels / traffic" hint="Each channel consolidated across your events: views to baskets to sales. Use channel links to attribute Instagram, newsletters, etc.">
						{channels.length === 0 ? (
							<p className="text-sm text-slate-500">No channels yet.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[480px] text-sm">
									<thead>
										<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
											<th className="py-2 pr-4">Channel</th>
											<th className="py-2 pr-4">Events</th>
											<th className="py-2 pr-4">Views</th>
											<th className="py-2 pr-4">Baskets</th>
											<th className="py-2 pr-4">Sales</th>
											<th className="py-2 pr-4">View→Basket</th>
											<th className="py-2">Basket→Sale</th>
										</tr>
									</thead>
									<tbody>
										{channels.slice(0, 40).map((c) => (
											<tr key={c.name} className="border-b border-slate-100 last:border-0">
												<td className="py-2 pr-4 font-medium text-slate-800">{channelLabel(c.name)}</td>
												<td className="py-2 pr-4 text-slate-500">{(c.sales ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-slate-700">{(c.views ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-slate-700">{(c.baskets ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-slate-700">{(c.success ?? 0).toLocaleString()}</td>
												<td className="py-2 pr-4 text-slate-500">{c.viewToBasketPct ?? 0}%</td>
												<td className="py-2">
													<span className={c.basketToSuccessPct >= 50 ? "font-medium text-emerald-600" : "text-slate-700"}>{c.basketToSuccessPct ?? 0}%</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>

					<Card title="Coupons" hint="Redemptions and discount cost per code.">
						{coupons.length === 0 ? (
							<p className="text-sm text-slate-500">No coupons yet.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[480px] text-sm">
									<thead>
										<tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
											<th className="py-2 pr-4">Code</th>
											<th className="py-2 pr-4">Redemptions</th>
											<th className="py-2">Discount given</th>
										</tr>
									</thead>
									<tbody>
										{coupons.slice(0, 50).map((c) => (
											<tr key={c._id} className="border-b border-slate-100 last:border-0">
												<td className="py-2 pr-4 font-medium text-slate-800">{c.code ?? "-"}</td>
												<td className="py-2 pr-4 text-slate-700">{(c.redemptions ?? 0).toLocaleString()}</td>
												<td className="py-2 text-slate-700">{c.discountCents ? `€${(c.discountCents / 100).toLocaleString()}` : "—"}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>
				</div>
			)}
		</div>
	);
};

export default Analytics;
