import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { get, post } from "../../lib/client";
import Info from "../shared/Info";
import strings from "../../localization";

// These figures come from the analytics facts, which only move when the
// `analytics.rollup` job runs - every 4h, and only in the worker. Where the
// worker is held down (any host on a production clone) the facts freeze, and
// the band went on showing weeks-old numbers beside live sales figures. A day
// covers several missed runs without flapping; past that, show nothing rather
// than something contradicting the rest of the dashboard.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const SEGMENT_KEYS = ["whale", "fan", "repeat", "hesitant", "direct", "one_time"];
const segmentLabel = (key) =>
	SEGMENT_KEYS.includes(key) ? strings(`page.analytics.segment.${key}`) : key;

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
	const [refreshing, setRefreshing] = useState(false);
	const [refreshError, setRefreshError] = useState(false);

	const load = useCallback(
		() => get("/facts/summary").then((r) => r.data),
		[],
	);

	// Runs the rollup inline in the API process, which is why this works on
	// hosts where the worker is held down - the case that makes the figures go
	// stale in the first place. The endpoint is a no-op if the facts moved in
	// the last two minutes, so calling it freely costs nothing.
	const refresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshError(false);
		try {
			const r = await post("/facts/refresh");
			if (r?.data) setS(r.data);
			return true;
		} catch {
			setRefreshError(true);
			return false;
		} finally {
			setRefreshing(false);
		}
	}, []);

	// Paint from whatever is stored, so the band appears with the rest of the
	// dashboard rather than waiting on a rollup.
	useEffect(() => {
		let alive = true;
		load()
			.then((d) => alive && setS(d))
			.catch(() => alive && setHidden(true));
		return () => {
			alive = false;
		};
	}, [load]);

	// Then bring it level with the sales tiles beside it. Separate from the
	// load above so a failed refresh leaves the stored figures on screen
	// instead of hiding a band that read fine.
	useEffect(() => {
		refresh();
	}, [refresh]);

	const RefreshButton = () => (
		<button
			type="button"
			onClick={refresh}
			disabled={refreshing}
			className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
		>
			<i className={`fa-solid fa-arrows-rotate ${refreshing ? "fa-spin" : ""}`} aria-hidden />
			{strings(refreshing ? "dashboard.facts.refreshing" : "dashboard.facts.refresh")}
		</button>
	);

	if (hidden) return null;
	if (!s) return null;
	if (!s.buyers && !s.sales?.sold) return null; // nothing rolled up yet
	// No timestamp at all means the rollup predates this field, so its age is
	// unknown - treat that as stale too rather than vouching for it.
	const rolledUpAt = s.rolledUpAt ? dayjs(s.rolledUpAt) : null;
	const stale = !rolledUpAt || dayjs().diff(rolledUpAt) > STALE_AFTER_MS;

	// Still stale after the refresh above means the rollup could not run at all.
	// Hiding the band outright would take the retry with it, so show the prompt
	// rather than numbers that contradict the live sales tiles.
	if (stale) {
		return (
			<section className="mb-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
				<p className="text-sm text-slate-500">
					{refreshError ? strings("dashboard.facts.refreshFailed") : strings("dashboard.facts.stale")}
				</p>
				<RefreshButton />
			</section>
		);
	}

	const top = s.topSegment;
	return (
		<section className="mb-8" aria-label={strings("dashboard.facts.title")}>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-baseline gap-2">
					<h2 className="text-lg font-medium text-slate-900">{strings("dashboard.facts.title")}</h2>
					{/* Even inside the window these lag live sales by up to 4h. */}
					<span className="text-xs text-slate-500">
						{strings("dashboard.facts.asOf", [rolledUpAt.format("D MMM, HH:mm")])}
					</span>
				</div>
				<div className="flex items-center gap-4">
					<RefreshButton />
					<Link href="/analytics" className="text-sm font-medium text-blue-600 hover:text-blue-700">
						{strings("dashboard.facts.full")} →
					</Link>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<Fact label={strings("page.analytics.stat.buyers")} value={(s.buyers ?? 0).toLocaleString()} info={strings("dashboard.facts.buyersInfo")} />
				<Fact
					label={strings("dashboard.facts.topSegment")}
					value={top ? segmentLabel(top.segment) : "-"}
					info={strings("dashboard.facts.topSegmentInfo")}
				/>
				<Fact
					label={strings("page.analytics.stat.winback")}
					value={`${s.winback?.ratePct ?? 0}%`}
					tone={s.winback?.ratePct >= 10 ? "text-emerald-600" : "text-slate-900"}
					info={strings("dashboard.facts.winbackInfo")}
				/>
				<Fact
					label={strings("page.analytics.stat.noShow")}
					value={`${s.sales?.noShowPct ?? 0}%`}
					tone={s.sales?.noShowPct >= 20 ? "text-amber-600" : "text-slate-900"}
					info={strings("dashboard.facts.noShowInfo")}
				/>
				<Fact label={strings("page.analytics.stat.sellThrough")} value={`${s.sales?.sellThroughPct ?? 0}%`} info={strings("dashboard.facts.sellThroughInfo")} />
			</div>
		</section>
	);
};

export default FactsBand;
