import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { SearchBar } from "../../../components/shared";
import EmptyState from "../../../components/shared/EmptyState";
import { get } from "../../../lib/client";
import strings from "../../../localization";

const PAGE_SIZE = 50;

const LEVEL_BADGE = {
	info: "bg-slate-100 text-slate-700",
	warn: "bg-amber-100 text-amber-800",
	error: "bg-red-100 text-red-700",
};

const CATEGORY_BADGE = {
	transaction: "bg-emerald-100 text-emerald-800",
	mail: "bg-sky-100 text-sky-800",
	report: "bg-violet-100 text-violet-800",
	job: "bg-slate-100 text-slate-700",
	reservation: "bg-amber-100 text-amber-800",
	account: "bg-indigo-100 text-indigo-800",
};

const formatStamp = (d) =>
	d ? dayjs(d).format("D MMM YYYY HH:mm:ss") : "-";

const EventRow = ({ event, onChain }) => {
	const [open, setOpen] = useState(false);
	const badge = CATEGORY_BADGE[event.category] ?? "bg-slate-100 text-slate-700";
	const lvl = LEVEL_BADGE[event.level] ?? LEVEL_BADGE.info;
	return (
		<div className="rounded-lg border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-start justify-between gap-3 p-3 text-left"
			>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
						>
							{event.category}
						</span>
						<span className="font-mono text-sm font-medium text-slate-900">
							{event.action}
						</span>
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${lvl}`}
						>
							{event.level}
						</span>
						{event.target?.type && (
							<span className="font-mono text-xs text-slate-500">
								{event.target.type}
								{event.target.id ? `:${String(event.target.id).slice(-6)}` : ""}
							</span>
						)}
					</div>
					<div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
						<span>{formatStamp(event.createdAt)}</span>
						<span>actor: {event.actor?.kind ?? "-"}</span>
						{event.correlationId && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onChain(event.correlationId);
								}}
								className="font-mono text-xs text-sky-700 underline hover:text-sky-900"
							>
								chain {event.correlationId.slice(0, 8)}
							</button>
						)}
					</div>
				</div>
				<i
					className={`fa-solid fa-chevron-${open ? "up" : "down"} mt-1 text-xs text-slate-400`}
					aria-hidden
				/>
			</button>
			{open && (
				<div className="border-t border-slate-100 bg-slate-50/50 p-3">
					<pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-700">
						{JSON.stringify(event, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
};

const Events = () => {
	const [, setLocation] = useLocation();
	const [events, setEvents] = useState([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [skip, setSkip] = useState(0);

	// Filters
	const [q, setQ] = useState("");
	const [category, setCategory] = useState("");
	const [level, setLevel] = useState("");
	const [correlationId, setCorrelationId] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	// Read correlationId from URL on first load so /events?correlationId=X
	// links from row chain buttons land in a pre-filtered view.
	useEffect(() => {
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		const cid = url.searchParams.get("correlationId");
		if (cid) setCorrelationId(cid);
	}, []);

	const fetchEvents = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (q) params.set("q", q);
			if (category) params.set("category", category);
			if (level) params.set("level", level);
			if (correlationId) params.set("correlationId", correlationId);
			if (from) params.set("from", from);
			if (to) params.set("to", to);
			params.set("limit", String(PAGE_SIZE));
			params.set("skip", String(skip));
			const res = await get(`/events?${params}`);
			setEvents(res?.data?.events ?? []);
			setTotal(res?.data?.total ?? 0);
			setError(null);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoad"));
		} finally {
			setLoading(false);
		}
	}, [q, category, level, correlationId, from, to, skip]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	const onChain = useCallback((cid) => {
		setCorrelationId(cid);
		setSkip(0);
		// Reflect in URL so the view is shareable.
		const url = new URL(window.location.href);
		url.searchParams.set("correlationId", cid);
		window.history.replaceState({}, "", url.toString());
	}, []);

	const clearFilters = useCallback(() => {
		setQ("");
		setCategory("");
		setLevel("");
		setCorrelationId("");
		setFrom("");
		setTo("");
		setSkip(0);
		const url = new URL(window.location.href);
		url.searchParams.delete("correlationId");
		window.history.replaceState({}, "", url.toString());
	}, []);

	const hasFilters = useMemo(
		() => Boolean(q || category || level || correlationId || from || to),
		[q, category, level, correlationId, from, to],
	);

	const page = Math.floor(skip / PAGE_SIZE) + 1;
	const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">
						{strings("page.events.title") || "Audit log"}
					</h1>
					<p className="text-sm text-slate-500">
						{strings("page.events.subtitle")
							|| "Backend events: transactions, mailings, reports, job runs."}
					</p>
				</div>
				{hasFilters && (
					<button
						type="button"
						onClick={clearFilters}
						className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
					>
						{strings("common.clear") || "Clear filters"}
					</button>
				)}
			</div>

			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SearchBar
					value={q}
					onChange={(v) => {
						setQ(v);
						setSkip(0);
					}}
					placeholder={
						strings("page.events.searchPlaceholder")
						|| "Search category or action"
					}
				/>
				<select
					value={category}
					onChange={(e) => {
						setCategory(e.target.value);
						setSkip(0);
					}}
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
				>
					<option value="">All categories</option>
					<option value="transaction">transaction</option>
					<option value="mail">mail</option>
					<option value="report">report</option>
					<option value="job">job</option>
					<option value="reservation">reservation</option>
					<option value="account">account</option>
				</select>
				<select
					value={level}
					onChange={(e) => {
						setLevel(e.target.value);
						setSkip(0);
					}}
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
				>
					<option value="">All levels</option>
					<option value="info">info</option>
					<option value="warn">warn</option>
					<option value="error">error</option>
				</select>
				<input
					type="text"
					value={correlationId}
					onChange={(e) => {
						setCorrelationId(e.target.value);
						setSkip(0);
					}}
					placeholder="correlationId"
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-700"
				/>
				<input
					type="datetime-local"
					value={from}
					onChange={(e) => {
						setFrom(e.target.value);
						setSkip(0);
					}}
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
				/>
				<input
					type="datetime-local"
					value={to}
					onChange={(e) => {
						setTo(e.target.value);
						setSkip(0);
					}}
					className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
				/>
			</div>

			{!loading && events.length === 0 ? (
				<EmptyState
					icon="fa-clipboard-list"
					title={strings("page.events.empty") || "No events match"}
					description={
						strings("page.events.emptyDesc")
						|| "Try clearing the filters or expand the date range."
					}
				/>
			) : (
				<div className="space-y-2">
					{events.map((e) => (
						<EventRow key={e._id} event={e} onChain={onChain} />
					))}
				</div>
			)}

			{total > PAGE_SIZE && (
				<div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
					<span>
						{skip + 1}-{Math.min(skip + PAGE_SIZE, total)} of{" "}
						{total.toLocaleString()}
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							disabled={skip === 0}
							onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
							className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
						>
							Prev
						</button>
						<span className="px-2 py-1.5 text-sm">
							Page {page} / {lastPage}
						</span>
						<button
							type="button"
							disabled={skip + PAGE_SIZE >= total}
							onClick={() => setSkip(skip + PAGE_SIZE)}
							className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default Events;
