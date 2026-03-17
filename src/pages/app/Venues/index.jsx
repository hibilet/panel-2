import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { SlidePanel } from "../../../components/shared";
import { venuesColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import VenuePanel from "./Venue";

const LIMIT = 25;

const Venues = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();

	const venueId = id ?? null;

	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);

	const loading = fetchedPage !== page;

	const fetchVenues = useCallback(
		(silent = false) => {
			if (!silent) queueMicrotask(() => setError(null));
			get("/venues")
				.then((res) => {
					const items = res.data ?? [];
					setData(items);
					setTotal(res.count ?? res.total ?? items.length);
					setFetchedPage(page);
					setError(null);
				})
				.catch((err) => {
					setError(err?.message ?? strings("error.failedLoadVenues"));
					setFetchedPage(page);
				});
		},
		[page],
	);

	useEffect(() => {
		fetchVenues();
	}, [fetchVenues]);

	const paginatedData = data.slice((page - 1) * LIMIT, page * LIMIT);

	if (error && data.length === 0) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.venues.title")}
				</h1>
				<button
					type="button"
					onClick={() => setLocation("/venues/new")}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
				>
					<i className="fa-solid fa-plus" aria-hidden />
					{strings("page.venues.createNew")}
				</button>
			</div>

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={paginatedData}
					columns={venuesColumns}
					getRowKey={(r) => r.id ?? r._id}
					bare
					loading={loading}
					onRowClick={(row) => {
						const rid = row.id ?? row._id;
						if (rid) setLocation(`/venues/${rid}`);
					}}
					emptyMessage={strings("table.venue.noVenues")}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>

			<SlidePanel
				isOpen={!!venueId}
				onClose={() => setLocation("/venues")}
				title={
					venueId === "new"
						? strings("form.venue.newTitle")
						: strings("page.venues.details")
				}
				aria-label={
					venueId === "new"
						? strings("form.venue.newTitle")
						: "Venue details"
				}
			>
				{venueId && (
					<VenuePanel
						id={venueId}
						onClose={() => setLocation("/venues")}
						onSaved={(newId) => {
							fetchVenues(true);
							if (newId) setLocation(`/venues/${newId}`);
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Venues;
