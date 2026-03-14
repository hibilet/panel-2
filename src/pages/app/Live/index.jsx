import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import dayjs from "dayjs";

import { get } from "../../../lib/client";
import strings from "../../../localization";
import { useApp } from "../../../context";
import { toId } from "../../../utils/object";
import ReadByChart from "../../../components/charts/ReadByChart";

const getVenueName = (sale, venues) => {
	const v = sale?.venue;
	if (typeof v === "object" && v?.name) return v.name;
	const id = toId(v);
	return venues?.find((x) => x.id === id)?.name ?? (typeof v === "string" ? v : null) ?? "—";
};

const Live = () => {
	const { sales, venues, loading: appLoading } = useApp();
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const today = dayjs().format("YYYY-MM-DD");
	const eventsToday = useMemo(
		() =>
			(sales ?? []).filter((s) => {
				const d = s.startDate ?? s.start;
				return d && dayjs(d).format("YYYY-MM-DD") === today;
			}),
		[sales, today],
	);

	const fetchEventStats = useCallback(async () => {
		if (eventsToday.length === 0) {
			setEvents([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const results = await Promise.all(
				eventsToday.map(async (sale) => {
					const id = sale.id ?? sale._id;
					const [readersRes, attendeesRes, readRes] = await Promise.all([
						get(`/accounts/search?sale=${id}&type=account.reader`),
						get(`/sales/${id}/reservations?status=success,read&limit=10000&skip=0`),
						get(`/sales/${id}/reservations?status=read&limit=10000&skip=0`),
					]);
					const readers = readersRes?.data ?? [];
					const attendeesCount = attendeesRes?.count ?? 0;
					const readCount = readRes?.count ?? 0;
					return {
						...sale,
						readerCount: readers.length,
						attendeesCount,
						readCount,
						venueName: getVenueName(sale, venues),
					};
				}),
			);
			setEvents(results);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoad"));
		} finally {
			setLoading(false);
		}
	}, [eventsToday, venues]);

	useEffect(() => {
		if (appLoading) return;
		fetchEventStats();
	}, [appLoading, fetchEventStats]);

	if (appLoading || (loading && events.length === 0)) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="space-y-6">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-64 animate-pulse rounded-xl bg-slate-100"
						/>
					))}
				</div>
			</div>
		);
	}

	if (eventsToday.length === 0) {
		return (
			<div className="mx-auto max-w-5xl">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.live.title")}
				</h1>
				<div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
					<i className="fa-solid fa-tv mb-4 text-4xl text-slate-400" aria-hidden />
					<p className="text-lg font-medium">{strings("page.live.noEventsToday")}</p>
					<p className="mt-2 text-sm">{strings("page.live.noEventsTodayDesc")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<h1 className="text-2xl font-semibold text-slate-900">
				{strings("page.live.title")}
			</h1>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="space-y-6">
				{events.map((event) => {
					const eventStart = event.start ?? event.startDate;
					return (
						<div
							key={event.id ?? event._id}
							className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
						>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<Link
										href={`/sales/${event.id ?? event._id}`}
										className="text-lg font-semibold text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 rounded"
									>
										{event.name ?? strings("common.untitled")}
									</Link>
									<p className="mt-1 text-sm text-slate-500">
										{event.venueName}
									</p>
									<dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
										<div className="flex gap-1.5">
											<dt className="text-slate-500">
												{strings("page.live.readerAccounts")}:
											</dt>
											<dd className="font-medium text-slate-900">
												{event.readerCount}
											</dd>
										</div>
										<div className="flex gap-1.5">
											<dt className="text-slate-500">
												{strings("page.live.attendeesRead")}:
											</dt>
											<dd className="font-medium text-slate-900">
												{strings("page.live.attendeesReadValue", [
													event.readCount,
													event.attendeesCount,
												])}
											</dd>
										</div>
									</dl>
								</div>
								<Link
									href={`/sales/${event.id ?? event._id}`}
									className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
								>
									{strings("common.viewAll")}
								</Link>
							</div>
							<div className="mt-6 h-48 w-full">
								<ReadByChart
									saleId={event.id ?? event._id}
									eventStart={eventStart}
									height={192}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default Live;
