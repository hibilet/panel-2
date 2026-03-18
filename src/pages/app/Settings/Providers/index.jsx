import { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useParams } from "wouter";

import { useApp } from "../../../../context";
import { get } from "../../../../lib/client";
import strings from "../../../../localization";
import SlidePanel from "../../../../components/shared/SlidePanel";
import DataTable from "../../../../components/tables/DataTable";
import { providersColumns } from "../../../../components/tables/columns";
import ProviderPanel from "./Provider";

const Providers = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const { refreshAccount } = useApp();
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchProviders = useCallback((silent = false) => {
		if (!silent) {
			setLoading(true);
			setError(null);
		}
		get("/providers")
			.then((res) => setData(res.data ?? []))
			.catch(
				(err) =>
					!silent &&
					setError(err?.message ?? strings("error.failedLoadProviders")),
			)
			.finally(() => !silent && setLoading(false));
	}, []);

	useEffect(() => {
		fetchProviders();
	}, [fetchProviders]);

	if (error && !loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<Link
					href="/settings"
					className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
				>
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.settings")}
				</Link>
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
					<i
						className="fa-solid fa-credit-card text-slate-600 dark:text-slate-400"
						aria-hidden
					/>
					{strings("page.settings.saleProviders")}
				</h1>
				<button
					type="button"
					onClick={() => setLocation("/settings/providers/new")}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
				>
					<i className="fa-solid fa-plus" aria-hidden />
					{strings("page.settings.createNewProvider")}
				</button>
			</div>

			<DataTable
				data={data}
				columns={providersColumns}
				getRowKey={(r) => r.id}
				onRowClick={(row) =>
					row.id && setLocation(`/settings/providers/${row.id}`)
				}
				loading={loading}
				dark
				emptyMessage={strings("table.provider.noProviders")}
			/>

			<SlidePanel
				isOpen={!!id}
				onClose={() => setLocation("/settings/providers")}
				title={
					id === "new"
						? strings("form.provider.newTitle")
						: strings("form.provider.editTitle")
				}
				aria-label={
					id === "new"
						? strings("form.provider.newTitle")
						: strings("form.provider.editTitle")
				}
			>
				{id && (
					<ProviderPanel
						id={id}
						onClose={() => setLocation("/settings/providers")}
						onSaved={(newId) => {
							fetchProviders(true);
							refreshAccount?.();
							if (newId) setLocation(`/settings/providers/${newId}`);
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Providers;
