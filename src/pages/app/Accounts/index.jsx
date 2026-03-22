import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useParams } from "wouter";
import { Modal, SlidePanel } from "../../../components/shared";
import {
	customersColumns,
	merchantsColumns,
} from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import AccountPanel from "./Account";

const LIMIT = 25;

const tabItems = [
	{
		path: "merchants",
		labelKey: "page.accounts.tab.merchants",
		icon: "fa-store",
	},
	{
		path: "customers",
		labelKey: "page.accounts.tab.customers",
		icon: "fa-user",
	},
];

const TabLink = ({ path, labelKey, icon, isActive }) => (
	<Link
		href={`/accounts/${path}`}
		role="tab"
		aria-selected={isActive}
		aria-current={isActive ? "page" : undefined}
		className={`
			flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium
			transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
			${
				isActive
					? "bg-slate-900 text-white"
					: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
			}
		`}
	>
		<i className={`fa-solid ${icon}`} aria-hidden />
		<span>{strings(labelKey)}</span>
	</Link>
);

const Accounts = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const [location] = useLocation();

	const activeTab = location.includes("/customers") ? "customers" : "merchants";
	const accountId = id ?? null;

	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);
	const [filterEmail, setFilterEmail] = useState("");
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const { register, handleSubmit, reset } = useForm({
		defaultValues: { email: "" },
	});

	useEffect(() => {
		if (filterDialogOpen) {
			reset({ email: filterEmail });
		}
	}, [filterDialogOpen, filterEmail, reset]);

	const loading = fetchedPage !== page;

	const fetchAccounts = useCallback(() => {
		const skip = (page - 1) * LIMIT;
		const params = new URLSearchParams({
			limit: String(LIMIT),
			skip: String(skip),
			type: activeTab === "merchants" ? "account.merchant" : "account.customer",
		});
		if (filterEmail?.trim()) params.set("email", filterEmail.trim());
		queueMicrotask(() => setError(null));
		get(`/accounts/search?${params}&status=active`)
			.then((res) => {
				setData(res.data ?? []);
				setTotal(res.total ?? res.count ?? 0);
				setFetchedPage(page);
				setError(null);
			})
			.catch((err) => {
				setError(err?.message ?? strings("error.failedLoadAccounts"));
				setFetchedPage(page);
			});
	}, [page, filterEmail, activeTab]);

	useEffect(() => {
		fetchAccounts();
	}, [fetchAccounts]);

	if (error && data.length === 0) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error}
				</div>
			</div>
		);
	}

	const closeFilterDialog = () => setFilterDialogOpen(false);

	const onFilterSubmit = (formData) => {
		setFilterEmail(formData.email?.trim() ?? "");
		setPage(1);
		closeFilterDialog();
	};

	const isTabActive = (path) => location.startsWith(`/accounts/${path}`);
	const tabPath = `/accounts/${activeTab}`;

	const columns =
		activeTab === "merchants" ? merchantsColumns : customersColumns;
	const emptyMessage =
		activeTab === "merchants"
			? strings("table.account.noMerchants")
			: strings("table.account.noCustomers");

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.accounts.title")}
				</h1>
				<div className="flex items-center gap-2">
					{activeTab === "merchants" && (
						<button
							type="button"
							onClick={() => setLocation(`/accounts/merchants/new`)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("page.accounts.createAccount")}
						</button>
					)}
					<button
						type="button"
						onClick={() => setFilterDialogOpen(true)}
						className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
					>
						<i className="fa fa-search mr-2" aria-hidden />{" "}
						{strings("page.accounts.filter")}
					</button>
				</div>
			</div>

			{/* <nav aria-label="Account sections" className="mt-4">
				<div className="flex flex-wrap gap-2" role="tablist">
					{tabItems.map(({ path, labelKey, icon }) => (
						<TabLink
							key={path}
							path={path}
							labelKey={labelKey}
							icon={icon}
							isActive={isTabActive(path)}
						/>
					))}
				</div>
			</nav> */}

			<Modal
				isOpen={filterDialogOpen}
				onClose={closeFilterDialog}
				title={strings("page.accounts.filterAccounts")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={closeFilterDialog}
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							<i className="fa fa-close mr-2" aria-hidden />{" "}
							{strings("common.cancel")}
						</button>
						<button
							type="submit"
							form="filter-accounts-form"
							className="rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
						>
							<i className="fa fa-search mr-2" aria-hidden />{" "}
							{strings("page.accounts.filter")}
						</button>
					</div>
				}
			>
				<form
					id="filter-accounts-form"
					onSubmit={handleSubmit(onFilterSubmit)}
					className="space-y-4"
				>
					<label className="block">
						<span className="mb-1 block text-sm font-medium text-slate-700">
							{strings("page.accounts.email")}
						</span>
						<input
							{...register("email")}
							type="text"
							placeholder={strings("page.accounts.emailPlaceholder")}
							className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</label>
				</form>
			</Modal>

			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={data}
					columns={columns}
					getRowKey={(r) => r.id}
					bare
					loading={loading}
					onRowClick={(row) =>
						row.type !== "account.customer" &&
						row.id && setLocation(`/accounts/${activeTab}/${row.id}`)
					}
					emptyMessage={emptyMessage}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>

			<SlidePanel
				isOpen={!!accountId}
				onClose={() => setLocation(tabPath)}
				title={
					accountId === "new"
						? strings("page.accounts.createAccount")
						: strings("page.accounts.details")
				}
				aria-label={
					accountId === "new"
						? strings("page.accounts.createAccount")
						: "Account details"
				}
			>
				{accountId && (
					<AccountPanel
						id={accountId}
						accountType={
							activeTab === "merchants"
								? "account.merchant"
								: "account.customer"
						}
						onClose={() => setLocation(tabPath)}
						onSaved={(newId) => {
							fetchAccounts();
							if (newId) {
								setLocation(`/accounts/${activeTab}/${newId}`);
							} else {
								setLocation(tabPath);
							}
						}}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Accounts;
