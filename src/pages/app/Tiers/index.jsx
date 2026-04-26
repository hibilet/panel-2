import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import SlidePanel from "../../../components/shared/SlidePanel";
import DataTable from "../../../components/tables/DataTable";
import { get } from "../../../lib/client";
import strings, { formatCurrency } from "../../../localization";
import TierPanel from "./Tier";

const tiersColumns = [
	{
		key: "name",
		header: strings("table.tier.name"),
		headerCell: true,
		render: (r) => r.name ?? "—",
	},
	{
		key: "baseFee",
		header: strings("table.tier.baseFee"),
		align: "right",
		render: (r) => (r.baseFee != null ? formatCurrency(r.baseFee) : "—"),
	},
	{
		key: "commission",
		header: strings("table.tier.commission"),
		render: (r) => {
			if (!r.commission) return "—";
			const { amount, type } = r.commission;
			if (type === "percentage") return `${(amount * 100).toFixed(1)}%`;
			return formatCurrency(amount ?? 0);
		},
	},
	{
		key: "visibility",
		header: strings("table.tier.visibility"),
		render: (r) =>
			r.visibility === "private" ? (
				<span className="inline-flex items-center gap-1 text-slate-700">
					<i className="fa-solid fa-lock text-slate-500" aria-hidden />
					{strings("form.tier.visibilityPrivate")}
				</span>
			) : (
				<span className="inline-flex items-center gap-1 text-slate-500">
					<i className="fa-solid fa-lock-open text-slate-300" aria-hidden />
					{strings("form.tier.visibilityPublic")}
				</span>
			),
	},
	{
		key: "status",
		header: strings("table.tier.status"),
		render: (r) => (
			<span
				className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
					r.status === "active"
						? "bg-emerald-100 text-emerald-800"
						: "bg-slate-100 text-slate-600"
				}`}
			>
				{r.status ?? "—"}
			</span>
		),
	},
];

const Tiers = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchTiers = useCallback((silent = false) => {
		if (!silent) {
			setLoading(true);
			setError(null);
		}
		get("/tiers")
			.then((res) => setData(res.data ?? []))
			.catch(
				(err) =>
					!silent && setError(err?.message ?? strings("error.failedLoadTiers")),
			)
			.finally(() => !silent && setLoading(false));
	}, []);

	useEffect(() => {
		fetchTiers();
	}, [fetchTiers]);

	if (error && !loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i className="fa-solid fa-layer-group text-slate-600" aria-hidden />
					{strings("page.tiers.title")}
				</h1>
				<button
					type="button"
					onClick={() => setLocation("/tiers/new")}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
				>
					<i className="fa-solid fa-plus" aria-hidden />
					{strings("page.tiers.createTier")}
				</button>
			</div>

			<DataTable
				data={data}
				columns={tiersColumns}
				getRowKey={(r) => r.id ?? r.uuid}
				onRowClick={(row) => row.id && setLocation(`/tiers/${row.id}`)}
				loading={loading}
				dark
				emptyMessage={strings("table.tier.noTiers")}
			/>

			<SlidePanel
				isOpen={!!id}
				onClose={() => setLocation("/tiers")}
				title={id === "new" ? strings("form.tier.newTitle") : strings("form.tier.editTitle")}
				aria-label={id === "new" ? strings("form.tier.newTitle") : strings("form.tier.editTitle")}
			>
				{id && (
					<TierPanel
						id={id}
						onClose={() => setLocation("/tiers")}
						onSaved={(newId) => {
							fetchTiers(true);
							if (newId) {
								setLocation(`/tiers/${newId}`);
							} else {
								setLocation("/tiers");
							}
						}}
						onDeleted={() => {
							fetchTiers(true);
							setLocation("/tiers");
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Tiers;
