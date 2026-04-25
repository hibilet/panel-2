import { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";

import { useApp } from "../../../../context";
import { get } from "../../../../lib/client";
import { getToken } from "../../../../lib/storage";
import { showToast } from "../../../../lib/toastStore";
import strings from "../../../../localization";
import SlidePanel from "../../../../components/shared/SlidePanel";
import DataTable from "../../../../components/tables/DataTable";
import { providersColumns } from "../../../../components/tables/columns";
import ProviderPanel from "./Provider";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const STRIPE_CONNECT_ERROR_KEYS = {
	stripe_account_in_use: "error.stripeAccountInUse",
	invalid_state: "error.stripeInvalidState",
	access_denied: "error.stripeAccessDenied",
};

const Providers = () => {
	const [, setLocation] = useLocation();
	const search = useSearch();
	const { id } = useParams();
	const { refreshAccount, addProvider, updateProvider } = useApp();
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

	useEffect(() => {
		const params = new URLSearchParams(search);
		const attached = params.get("stripe_attached");
		const errCode = params.get("error");
		if (!attached && !errCode) return;

		if (attached === "1") {
			showToast("success", strings("toast.stripeAttached"));
			fetchProviders(true);
			refreshAccount?.();
		} else if (errCode) {
			const key = STRIPE_CONNECT_ERROR_KEYS[errCode] ?? "error.stripeConnectFailed";
			showToast("error", strings(key));
		}

		params.delete("stripe_attached");
		params.delete("error");
		const next = params.toString();
		window.history.replaceState(
			{},
			"",
			`/settings/providers${next ? `?${next}` : ""}`,
		);
	}, [search, fetchProviders, refreshAccount]);

	const handleConnectStripe = () => {
		const token = getToken();
		if (!token) return;
		window.location.href = `${API_BASE_URL}/auth/stripe/connect?token=${encodeURIComponent(token)}`;
	};

	if (error && !loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-6">
				<Link
					href="/settings"
					className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
				>
					<i className="fa-solid fa-arrow-left" aria-hidden />
					{strings("back.settings")}
				</Link>
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i
						className="fa-solid fa-credit-card text-slate-600"
						aria-hidden
					/>
					{strings("page.settings.saleProviders")}
				</h1>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={handleConnectStripe}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#635bff] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#574fe6]"
					>
						<i className="fa-brands fa-stripe-s" aria-hidden />
						{strings("page.settings.connectStripe")}
					</button>
					<button
						type="button"
						onClick={() => setLocation("/settings/providers/new")}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{strings("page.settings.createNewProvider")}
					</button>
				</div>
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
						onSaved={() => {
							refreshAccount?.();
							fetchProviders(true);
							setLocation("/settings/providers");
						}}
						onDeleted={() => {
							refreshAccount?.();
							fetchProviders(true);
							setLocation("/settings/providers");
						}}
						onProviderAdded={addProvider}
						onProviderUpdated={updateProvider}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Providers;
