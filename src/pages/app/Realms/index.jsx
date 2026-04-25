import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import SlidePanel from "../../../components/shared/SlidePanel";
import DataTable from "../../../components/tables/DataTable";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import RealmPanel from "./Realm";

const formatDateTime = (value) => {
	if (!value) return "—";
	try {
		return new Date(value).toLocaleString();
	} catch {
		return "—";
	}
};

const realmsColumns = [
	{
		key: "name",
		header: strings("table.realm.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "domains",
		header: strings("table.realm.domains"),
		render: (r) => {
			const list = Array.isArray(r.domains) ? r.domains : [];
			if (list.length === 0) return "—";
			return list.map((d) => d.hostname ?? d).join(", ");
		},
	},
	{
		key: "dashboard",
		header: strings("table.realm.dashboard"),
		render: (r) => r.urls?.dashboard ?? "—",
	},
	{
		key: "createdAt",
		header: strings("table.realm.createdAt"),
		render: (r) => formatDateTime(r.createdAt),
	},
];

const Realms = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchRealms = useCallback((silent = false) => {
		if (!silent) {
			setLoading(true);
			setError(null);
		}
		get("/realms")
			.then((res) => setData(res.data ?? []))
			.catch(
				(err) => !silent && setError(err?.message ?? strings("error.failedLoadRealms")),
			)
			.finally(() => !silent && setLoading(false));
	}, []);

	useEffect(() => {
		fetchRealms();
	}, [fetchRealms]);

	if (error && !loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i className="fa-solid fa-globe text-slate-600" aria-hidden />
					{strings("page.realms.title")}
				</h1>
				<button
					type="button"
					onClick={() => setLocation("/realms/new")}
					className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
				>
					<i className="fa-solid fa-plus" aria-hidden />
					{strings("page.realms.create")}
				</button>
			</div>

			<DataTable
				data={data}
				columns={realmsColumns}
				getRowKey={(r) => r.id ?? r._id}
				onRowClick={(row) => {
					const rid = row.id ?? row._id;
					if (rid) setLocation(`/realms/${rid}`);
				}}
				loading={loading}
				emptyMessage={strings("table.realm.noRealms")}
			/>

			<SlidePanel
				isOpen={!!id}
				onClose={() => setLocation("/realms")}
				title={
					id === "new"
						? strings("form.realm.newTitle")
						: strings("form.realm.editTitle")
				}
				aria-label={
					id === "new"
						? strings("form.realm.newTitle")
						: strings("form.realm.editTitle")
				}
			>
				{id && (
					<RealmPanel
						id={id}
						onClose={() => setLocation("/realms")}
						onSaved={() => {
							fetchRealms(true);
							setLocation("/realms");
						}}
						onDeleted={() => {
							fetchRealms(true);
							setLocation("/realms");
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Realms;
