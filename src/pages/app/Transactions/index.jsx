import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Modal, SlidePanel } from "../../../components/shared";
import { transactionsColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import Pagination from "../../../components/tables/Pagination";
import { get } from "../../../lib/client";
import strings from "../../../localization";
import TransactionPanel from "./Transaction";

const LIMIT = 25;

const Transactions = () => {
	const [, setLocation] = useLocation();
	const { id } = useParams();
	const [data, setData] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [fetchedPage, setFetchedPage] = useState(null);
	const [error, setError] = useState(null);
	const [filterId, setFilterId] = useState("");
	const [filterEmail, setFilterEmail] = useState("");
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	const loading = fetchedPage !== page;

	useEffect(() => {
		const skip = (page - 1) * LIMIT;
		const params = new URLSearchParams({
			limit: String(LIMIT),
			skip: String(skip),
			status: "success",
		});
		if (filterId?.trim()) params.set("id", filterId.trim());
		if (filterEmail?.trim()) params.set("email", filterEmail.trim());
		queueMicrotask(() => setError(null));
		get(`/transactions/search?${params}`)
			.then((res) => {
				setData(res.data ?? []);
				setTotal(res.total ?? res.count ?? 0);
				setFetchedPage(page);
				setError(null);
			})
			.catch((err) => {
				setError(err?.message ?? strings("error.failedLoadTransactions"));
				setFetchedPage(page);
			});
	}, [page, filterId, filterEmail]);

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

	const handleFilterSubmit = (e) => {
		e.preventDefault();
		const form = e.target;
		setFilterId(form.id?.value?.trim() ?? "");
		setFilterEmail(form.email?.value?.trim() ?? "");
		setPage(1);
		closeFilterDialog();
	};

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.transactions.title")}
				</h1>
				<button
					type="button"
					onClick={() => setFilterDialogOpen(true)}
					className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
				>
					🔍 {strings("page.transactions.filter")}
				</button>
			</div>
			<Modal
				isOpen={filterDialogOpen}
				onClose={closeFilterDialog}
				title={strings("page.transactions.filterTransactions")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={closeFilterDialog}
							className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							❌ {strings("common.cancel")}
						</button>
						<button
							type="submit"
							form="filter-transactions-form"
							className="rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
						>
							🔍 {strings("page.transactions.filter")}
						</button>
					</div>
				}
			>
				<form
					id="filter-transactions-form"
					onSubmit={handleFilterSubmit}
					className="space-y-4"
				>
					<label className="block">
						<span className="mb-1 block text-sm font-medium text-slate-700">
							{strings("page.transactions.transactionId")}
						</span>
						<input
							name="id"
							type="text"
							placeholder={strings(
								"page.transactions.transactionIdPlaceholder",
							)}
							defaultValue={filterId}
							className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-sm font-medium text-slate-700">
							{strings("page.transactions.email")}
						</span>
						<input
							name="email"
							type="text"
							placeholder={strings("page.transactions.emailPlaceholder")}
							defaultValue={filterEmail}
							className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</label>
				</form>
			</Modal>
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<DataTable
					data={data}
					columns={transactionsColumns}
					getRowKey={(r) => r.id}
					bare
					loading={loading}
					onRowClick={(row) => row.id && setLocation(`/transactions/${row.id}`)}
					emptyMessage={strings("table.transaction.noTransactions")}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>
			<SlidePanel
				isOpen={!!id}
				onClose={() => setLocation("/transactions")}
				title={strings("page.transactions.details")}
				aria-label="Transaction details"
			>
				{id && (
					<TransactionPanel
						id={id}
						onClose={() => setLocation("/transactions")}
					/>
				)}
			</SlidePanel>
		</div>
	);
};

export default Transactions;
