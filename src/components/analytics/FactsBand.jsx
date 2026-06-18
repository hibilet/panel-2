import { useEffect, useState } from "react";
import { Link } from "wouter";
import { get } from "../../lib/client";
import Info from "../shared/Info";

const SEGMENT_LABEL = {
	whale: "Whales",
	fan: "Fans",
	repeat: "Repeat",
	hesitant: "Hesitant",
	direct: "Direct buyers",
	one_time: "One-time",
};

const Fact = ({ label, value, tone, info }) => (
	<div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
		<p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
			{label}
			<Info text={info} />
		</p>
		<p className={`mt-0.5 text-lg font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
	</div>
);

// Compact audience + performance snapshot from the analytics facts. Deep views
// live on /analytics; this is the glanceable band for the dashboard.
const FactsBand = () => {
	const [s, setS] = useState(null);
	const [hidden, setHidden] = useState(false);

	useEffect(() => {
		let alive = true;
		get("/analytics/summary")
			.then((r) => alive && setS(r.data))
			.catch(() => alive && setHidden(true));
		return () => {
			alive = false;
		};
	}, []);

	if (hidden) return null;
	if (!s) return null;
	if (!s.buyers && !s.sales?.sold) return null; // nothing rolled up yet

	const top = s.topSegment;
	return (
		<section className="mb-8" aria-label="Audience and performance">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-lg font-medium text-slate-900">Audience &amp; performance</h2>
				<Link href="/analytics" className="text-sm font-medium text-blue-600 hover:text-blue-700">
					Full analytics →
				</Link>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<Fact label="Buyers" value={(s.buyers ?? 0).toLocaleString()} info="Distinct customers with at least one successful purchase." />
				<Fact
					label="Top segment"
					value={top ? `${SEGMENT_LABEL[top.segment] ?? top.segment}` : "-"}
					info="Your largest behavioral buyer group."
				/>
				<Fact
					label="Win-back"
					value={`${s.winback?.ratePct ?? 0}%`}
					tone={s.winback?.ratePct >= 10 ? "text-emerald-600" : "text-slate-900"}
					info="Share of churned leads who later purchased - remarketing effectiveness."
				/>
				<Fact
					label="No-show"
					value={`${s.sales?.noShowPct ?? 0}%`}
					tone={s.sales?.noShowPct >= 20 ? "text-amber-600" : "text-slate-900"}
					info="Sold tickets never scanned at the gate, for ended events. Needs door scanning to be meaningful."
				/>
				<Fact label="Sell-through" value={`${s.sales?.sellThroughPct ?? 0}%`} info="Tickets sold vs total capacity." />
			</div>
		</section>
	);
};

export default FactsBand;
