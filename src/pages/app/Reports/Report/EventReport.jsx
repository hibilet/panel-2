import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import EventReportCard from "../../../../components/EventReportCard";
import { useApp } from "../../../../context";
import { get } from "../../../../lib/client";
import strings from "../../../../localization";
import { toId } from "../../../../utils/object";

const getVenueName = (sale, venues) => {
	const v = sale?.venue;
	if (typeof v === "object" && v?.name) return v.name;
	const id = toId(v);
	return (
		venues?.find((x) => x.id === id)?.name ??
		(typeof v === "string" ? v : null) ??
		"—"
	);
};

const EventReport = () => {
	const { id } = useParams();
	const { venues } = useApp();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchReport = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const [saleRes, readersRes, attendeesRes, readRes] = await Promise.all([
				get(`/sales/${id}`),
				get(`/accounts/search?sale=${id}&type=account.reader`),
				get(`/sales/${id}/reservations?status=success,read&limit=10000&skip=0`),
				get(`/sales/${id}/reservations?status=read&limit=10000&skip=0`),
			]);
			const saleData = saleRes?.data ?? null;
			if (!saleData) {
				setEvent(null);
				return;
			}
			const readers = readersRes?.data ?? [];
			const attendeesCount = attendeesRes?.count ?? 0;
			const readCount = readRes?.count ?? 0;
			setEvent({
				...saleData,
				startDate: saleData.start ?? saleData.startDate,
				readerCount: readers.length,
				attendeesCount,
				readCount,
				venueName: getVenueName(saleData, venues),
			});
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoad"));
			setEvent(null);
		} finally {
			setLoading(false);
		}
	}, [id, venues]);

	useEffect(() => {
		fetchReport();
	}, [fetchReport]);

	if (!id) {
		return (
			<div className="mx-auto max-w-5xl">
				<Link
					href="/reports"
					className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
				>
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.reports")}
				</Link>
			</div>
		);
	}

	if (loading && !event) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
				<div className="h-64 animate-pulse rounded-xl bg-slate-100" />
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<Link
					href="/reports"
					className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
				>
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.reports")}
				</Link>
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error ?? strings("error.failedLoad")}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/reports"
				className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.reports")}
			</Link>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
					{error}
				</div>
			)}

			<EventReportCard event={event} />
		</div>
	);
};

export default EventReport;
