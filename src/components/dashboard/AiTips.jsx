import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../../context";
import { get } from "../../lib/client";
import { getLang } from "../../lib/storage";
import strings from "../../localization";

const SEVERITY_STYLES = {
	info: {
		card: "border-sky-200 bg-sky-50",
		badge: "bg-sky-100 text-sky-700",
		icon: "fa-circle-info text-sky-600",
	},
	warn: {
		card: "border-amber-200 bg-amber-50",
		badge: "bg-amber-100 text-amber-800",
		icon: "fa-triangle-exclamation text-amber-600",
	},
	critical: {
		card: "border-red-200 bg-red-50",
		badge: "bg-red-100 text-red-700",
		icon: "fa-circle-exclamation text-red-600",
	},
};

const resolveSubject = (subject, sales) => {
	if (!subject || !Array.isArray(sales)) return null;
	const lower = subject.toLowerCase();
	const match = sales.find((s) => s?.name?.toLowerCase() === lower);
	if (match) return match.id ?? match._id ?? null;
	const partial = sales.find((s) => s?.name?.toLowerCase().includes(lower));
	return partial ? (partial.id ?? partial._id ?? null) : null;
};

const AiTips = () => {
	const { sales } = useApp();
	const [tips, setTips] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(false);

	const fetchTips = useCallback((refresh = false) => {
		const lang = getLang() || "en";
		const url = `/dashboards/ai/tips?language=${lang}${refresh ? "&refresh=true" : ""}`;
		if (refresh) {
			queueMicrotask(() => setRefreshing(true));
		}
		get(url)
			.then((res) => {
				setTips(res?.data?.tips ?? []);
				setError(false);
			})
			.catch((err) => {
				if (err?.__sessionExpired) return;
				console.warn("ai-tips-failed", err);
				setError(true);
			})
			.finally(() => {
				setLoading(false);
				setRefreshing(false);
			});
	}, []);

	useEffect(() => {
		fetchTips(false);
	}, [fetchTips]);

	if (error) return null;
	if (!loading && (!tips || tips.length === 0)) return null;

	return (
		<section
			aria-labelledby="ai-tips-heading"
			className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
		>
			<div className="mb-3 flex items-center justify-between">
				<h2
					id="ai-tips-heading"
					className="flex items-center gap-2 text-sm font-semibold text-slate-900"
				>
					<i className="fa-solid fa-sparkles text-violet-600" aria-hidden />
					{strings("ai.tips.title")}
				</h2>
				<button
					type="button"
					onClick={() => fetchTips(true)}
					disabled={refreshing || loading}
					className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<i
						className={`fa-solid fa-arrows-rotate ${refreshing ? "fa-spin" : ""}`}
						aria-hidden
					/>
					{refreshing ? strings("ai.tips.refreshing") : strings("ai.tips.refresh")}
				</button>
			</div>
			{loading ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
						/>
					))}
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{tips.map((tip, idx) => {
						const sev = SEVERITY_STYLES[tip.severity] ?? SEVERITY_STYLES.info;
						const saleId = resolveSubject(tip.subject, sales);
						const subjectNode = saleId ? (
							<Link
								href={`/sales/${saleId}`}
								className="font-medium text-slate-700 underline-offset-2 hover:underline"
							>
								{tip.subject}
							</Link>
						) : (
							tip.subject && (
								<span className="font-medium text-slate-700">{tip.subject}</span>
							)
						);
						return (
							<div
								key={idx}
								className={`rounded-lg border p-3 ${sev.card}`}
							>
								<div className="mb-1.5 flex items-start gap-2">
									<i className={`fa-solid ${sev.icon} mt-0.5`} aria-hidden />
									<p className="text-sm font-semibold text-slate-900">
										{tip.title}
									</p>
								</div>
								{tip.action && (
									<p className="text-xs text-slate-700">{tip.action}</p>
								)}
								<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
									{tip.metric && <span>{tip.metric}</span>}
									{subjectNode}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default AiTips;
