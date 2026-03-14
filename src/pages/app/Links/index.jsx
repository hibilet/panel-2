import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";

import { get } from "../../../lib/client";
import strings from "../../../localization";
import DataTable from "../../../components/tables/DataTable";
import { linksColumns } from "../../../components/tables/columns";
import SlidePanel from "../../../components/shared/SlidePanel";
import LinkPanel from "./Link";
import { useApp } from "../../../context";

const mapRows = (rows) =>
	(rows ?? []).map((row) => ({
		...row,
		reservations: row.sales?.length ?? 0,
	}));

const Links = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [archivedLinks, setArchivedLinks] = useState([]);
	const [archivedLoading, setArchivedLoading] = useState(false);
	const [archivedFetched, setArchivedFetched] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [archivedError, setArchivedError] = useState(null);
	const { account } = useApp();

	const fetchLinks = useCallback(() => {
		setError(null);
		setLoading(true);
		get("/links")
			.then((res) => {
				setData(mapRows(res.data ?? []));
			})
			.catch((err) => {
				setError(err?.message ?? strings("error.failedLoadLinks"));
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		fetchLinks();
	}, [fetchLinks]);

	const fetchArchivedLinks = useCallback(() => {
		setArchivedLoading(true);
		setArchivedError(null);
		get("/links?status=archived")
			.then((res) => setArchivedLinks(mapRows(res.data ?? [])))
			.catch((err) => {
				setArchivedError(err?.message ?? strings("error.failedLoadLinks"));
			})
			.finally(() => setArchivedLoading(false));
	}, []);

	const handleViewArchived = () => {
		const next = !showArchived;
		setShowArchived(next);
		if (next && !archivedFetched) {
			setArchivedFetched(true);
			fetchArchivedLinks();
		}
	};

	const handleArchived = () => {
		fetchLinks();
		if (showArchived) fetchArchivedLinks();
	};

	if (error && !loading) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.links.title")}
				</h1>
				{account?.type === "merchant" && (
					<Link
						href="/links/new"
						className="inline-flex items-center justify-center rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
					>
						{strings("page.links.createNew")}
					</Link>
				)}
			</div>
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={data}
					columns={linksColumns}
					getRowKey={(r) => r.id ?? r.slug}
					onRowClick={(row) => row.id && setLocation(`/links/${row.id}`)}
					loading={loading}
				/>
			</div>

			<div className="flex flex-col gap-4">
				<button
					type="button"
					onClick={handleViewArchived}
					className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					{showArchived
						? strings("page.links.hideArchived")
						: strings("page.links.showArchived")}
				</button>
				{showArchived && (
					<>
						{archivedError ? (
							<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
								{archivedError}
							</div>
						) : (
							<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
								<DataTable
									data={archivedLinks}
									columns={linksColumns}
									getRowKey={(r) => r.id ?? r.slug}
									onRowClick={(row) =>
										row.id && setLocation(`/links/${row.id}`)
									}
									loading={archivedLoading}
								/>
							</div>
						)}
					</>
				)}
			</div>
			<SlidePanel
				isOpen={!!id}
				onClose={() => setLocation("/links")}
				title={strings("page.links.details")}
				aria-label="Link details"
			>
				{id && (
					<LinkPanel
						id={id}
						onClose={() => setLocation("/links")}
						onCreated={(newId) => setLocation(`/links/${newId}`)}
						onArchived={handleArchived}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Links;
