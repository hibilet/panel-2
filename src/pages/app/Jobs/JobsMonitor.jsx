import { useEffect, useRef, useState } from "react";

import { get } from "../../../lib/client";
import strings from "../../../localization";

// Human "in 2h 14m 03s" / "due now" / "running". Ticks client-side from the
// stored nextRunAt so the countdown is smooth; data is re-fetched periodically
// to pick up status changes + recomputed next-run times.
const eta = (ms) => {
	if (ms == null) return "—";
	if (ms <= 0) return strings("page.jobs.monitor.due");
	const s = Math.floor(ms / 1000);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
	return `${sec}s`;
};

const StatusDot = ({ status }) => {
	const map = {
		ok: "bg-emerald-500", error: "bg-red-500", running: "bg-blue-500",
		skipped: "bg-amber-400",
	};
	return <span className={`inline-block h-2 w-2 rounded-full ${map[status] || "bg-slate-300"}`} />;
};

const JobsMonitor = () => {
	const [jobs, setJobs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [tick, setTick] = useState(0); // forces re-render each second
	const baseRef = useRef({ rows: [], fetchedAt: 0 });

	const load = () => {
		get("/jobs/monitor")
			.then((res) => {
				baseRef.current = { rows: res.data ?? [], fetchedAt: Date.now() };
				setJobs(res.data ?? []);
			})
			.catch(() => setJobs([]))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		load();
		const poll = setInterval(load, 30000); // refresh status + next-run
		const t = setInterval(() => setTick((x) => x + 1), 1000); // countdown
		return () => { clearInterval(poll); clearInterval(t); };
	}, []);

	// Live ETA = stored etaMs minus elapsed since fetch.
	const elapsed = Date.now() - baseRef.current.fetchedAt;
	const rows = baseRef.current.rows.map((j) => ({
		...j,
		liveEtaMs: j.etaMs == null ? null : j.etaMs - elapsed,
	}));
	void tick;

	if (loading) return <p className="text-sm text-slate-500">{strings("loading")}</p>;

	const recurring = rows.filter((r) => !r.oneShot);
	const tasks = rows.filter((r) => r.oneShot);

	const Row = (j) => (
		<div key={j.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<StatusDot status={j.running ? "running" : j.lastStatus} />
					<span className="truncate text-sm font-medium text-slate-800">{j.label}</span>
					{!j.enabled && (
						<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
							{strings("page.jobs.monitor.disabled")}
						</span>
					)}
				</div>
				<div className="truncate text-xs text-slate-400">
					{j.schedule || strings("page.jobs.monitor.oneShot")}
					{j.lastError ? ` · ${j.lastError}` : ""}
				</div>
			</div>
			<div className="shrink-0 text-right">
				{j.running ? (
					<span className="text-sm font-semibold text-blue-600">{strings("page.jobs.monitor.running")}</span>
				) : (
					<span className={`text-sm font-semibold tabular-nums ${j.liveEtaMs != null && j.liveEtaMs <= 0 ? "text-amber-600" : "text-slate-900"}`}>
						{eta(j.liveEtaMs)}
					</span>
				)}
				<div className="text-[10px] text-slate-400">
					{j.lastRunAt ? `${strings("page.jobs.monitor.lastRun")}: ${new Date(j.lastRunAt).toLocaleString()}` : strings("page.jobs.monitor.neverRun")}
				</div>
			</div>
		</div>
	);

	return (
		<div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-slate-900">{strings("page.jobs.monitor.title")}</h2>
					<p className="text-xs text-slate-500">{strings("page.jobs.monitor.subtitle")}</p>
				</div>
				<button type="button" onClick={load} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
					<i className="fa-solid fa-rotate" aria-hidden /> {strings("page.jobs.monitor.refresh")}
				</button>
			</div>

			<h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{strings("page.jobs.monitor.recurring")}</h3>
			{recurring.length ? recurring.map(Row) : <p className="py-2 text-sm text-slate-400">{strings("page.jobs.monitor.none")}</p>}

			{tasks.length > 0 && (
				<>
					<h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{strings("page.jobs.monitor.tasks")}</h3>
					{tasks.map(Row)}
				</>
			)}
		</div>
	);
};

export default JobsMonitor;
