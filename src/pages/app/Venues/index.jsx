import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { SearchBar, SlidePanel } from "../../../components/shared";
import {
	venuesColumns,
	venuesMerchantColumns,
} from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { useApp } from "../../../context/AppContext";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import { matchesQuery } from "../../../utils/search";
import VenuePanel from "./Venue";

const LIMIT = 25;

const Venues = () => {
	const [, setLocation] = useLocation();
	const { account, addVenue, updateVenue } = useApp();
	const { id } = useParams();

	const venueId = id ?? null;

	// Venues are merchant-owned. Bounce admin if they navigate directly to
	// /venues/new (the list-page button is already gated, this is defense
	// for typed-URL access).
	useEffect(() => {
		if (venueId === "new" && account?.type === "account.admin") {
			setLocation("/venues", { replace: true });
		}
	}, [venueId, account?.type, setLocation]);

	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState("");

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

	const filteredData = query
		? data.filter((v) => matchesQuery(v.name, query) || matchesQuery(v.address, query))
		: data;
	const paginatedData = filteredData.slice((page - 1) * LIMIT, page * LIMIT);

	if (error && data.length === 0) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
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
				{account?.type === "account.merchant" && (
					<button
						type="button"
						onClick={() => setLocation("/venues/new")}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{strings("page.venues.createNew")}
					</button>
				)}
			</div>

			{(data?.length ?? 0) > 5 && (
				<SearchBar
					value={query}
					onChange={(v) => {
						setQuery(v);
						setPage(1);
					}}
					placeholder={strings("page.venues.searchPlaceholder") || strings("page.venues.title")}
				/>
			)}

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={paginatedData}
					columns={
						account?.type === "account.merchant"
							? venuesMerchantColumns
							: venuesColumns
					}
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
					total={query ? filteredData.length : total}
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
					venueId === "new" ? strings("form.venue.newTitle") : "Venue details"
				}
			>
				{venueId && (
					<VenuePanel
						id={venueId}
						onClose={() => setLocation("/venues")}
						onSaved={() => {
							fetchVenues(true);
							setLocation("/venues");
						}}
						onVenueAdded={addVenue}
						onVenueUpdated={updateVenue}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Venues;
