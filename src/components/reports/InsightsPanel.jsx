import { useCallback, useState } from "react";
import { Markdown } from "../shared";
import { getText } from "../../lib/client";
import { getLang } from "../../lib/storage";
import strings from "../../localization";

const EMPTY_BODY = "No event data available to summarize.";

const InsightsPanel = () => {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [text, setText] = useState("");
	const [cached, setCached] = useState(null);
	const [warning, setWarning] = useState(null);
	const [error, setError] = useState(null);
	const [loaded, setLoaded] = useState(false);

	const fetchSummary = useCallback((refresh = false) => {
		const lang = getLang() || "en";
		const url = `/reports/insights?ai-summary=true&language=${lang}${refresh ? "&refresh=true" : ""}`;
		if (refresh) setRefreshing(true);
		else setLoading(true);
		setError(null);
		getText(url)
			.then(({ text: body, headers }) => {
				setText(body);
				setCached(headers.get("X-AI-Cache"));
				setWarning(headers.get("X-AI-Summary-Error"));
				setLoaded(true);
			})
			.catch((err) => {
				if (err?.__sessionExpired) return;
				setError(err?.message ?? strings("ai.insights.error"));
			})
			.finally(() => {
				setLoading(false);
				setRefreshing(false);
			});
	}, []);

	const handleToggle = () => {
		const next = !open;
		setOpen(next);
		if (next && !loaded && !loading) fetchSummary(false);
	};

	const isEmpty = loaded && text.trim() === EMPTY_BODY;

	return (
		<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				onClick={handleToggle}
				className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
				aria-expanded={open}
			>
				<div className="flex items-center gap-3">
					<i className="fa-solid fa-sparkles text-violet-600" aria-hidden />
					<div>
						<p className="text-sm font-semibold text-slate-900">
							{strings("ai.insights.title")}
						</p>
						<p className="text-xs text-slate-500">
							{strings("ai.insights.subtitle")}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{loaded && cached && (
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${
								cached === "hit"
									? "bg-slate-100 text-slate-600"
									: "bg-emerald-100 text-emerald-700"
							}`}
						>
							{cached === "hit"
								? strings("ai.insights.cached")
								: strings("ai.insights.fresh")}
						</span>
					)}
					<i
						className={`fa-solid fa-chevron-${open ? "up" : "down"} text-slate-400`}
						aria-hidden
					/>
				</div>
			</button>

			{open && (
				<div className="border-t border-slate-200 px-4 py-4">
					{warning && (
						<div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
							{strings("ai.insights.warning", [warning])}
						</div>
					)}
					{error && (
						<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
							{error}
						</div>
					)}
					{loading && !loaded && (
						<div className="flex items-center gap-2 py-4 text-sm text-slate-500">
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							{strings("ai.insights.loading")}
						</div>
					)}
					{loaded && isEmpty && (
						<p className="py-2 text-sm text-slate-500">
							{strings("ai.insights.empty")}
						</p>
					)}
					{loaded && !isEmpty && !error && <Markdown>{text}</Markdown>}
					{loaded && !error && (
						<div className="mt-4 flex justify-end">
							<button
								type="button"
								onClick={() => fetchSummary(true)}
								disabled={refreshing}
								className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<i
									className={`fa-solid fa-arrows-rotate ${refreshing ? "fa-spin" : ""}`}
									aria-hidden
								/>
								{refreshing
									? strings("ai.insights.regenerating")
									: strings("ai.insights.regenerate")}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default InsightsPanel;
