import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, PanelHeader, SearchBar } from "../../../components/shared";
import EmptyState from "../../../components/shared/EmptyState";
import { jobsColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import SlidePanel from "../../../components/shared/SlidePanel";
import { del, get, post } from "../../../lib/client";
import strings from "../../../localization";
import { matchesQuery } from "../../../utils/search";
import JobDetail from "./JobDetail";
import JobForm from "./JobForm";

const Jobs = () => {
	const [jobs, setJobs] = useState([]);
	const [definitions, setDefinitions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState("");
	const [panelMode, setPanelMode] = useState(null);
	const [activeJob, setActiveJob] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);

	const refresh = useCallback(async () => {
		try {
			const res = await get("/jobs");
			setJobs(res?.data ?? []);
			setError(null);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoadJobs"));
		}
	}, []);

	useEffect(() => {
		setLoading(true);
		Promise.all([get("/jobs"), get("/jobs/definitions")])
			.then(([jobsRes, defsRes]) => {
				setJobs(jobsRes?.data ?? []);
				setDefinitions(defsRes?.data ?? []);
			})
			.catch((err) => setError(err?.message ?? strings("error.failedLoadJobs")))
			.finally(() => setLoading(false));
	}, []);

	const definitionMap = useMemo(() => {
		const map = {};
		for (const d of definitions) map[d.type] = d;
		return map;
	}, [definitions]);

	const getTypeLabel = useCallback(
		(type) => definitionMap[type]?.label ?? type,
		[definitionMap],
	);

	const filtered = useMemo(
		() =>
			jobs.filter(
				(j) =>
					matchesQuery(j.name, query) ||
					matchesQuery(j.type, query) ||
					matchesQuery(getTypeLabel(j.type), query),
			),
		[jobs, query, getTypeLabel],
	);

	const handleRowClick = (row) => {
		setActiveJob(row);
		setPanelMode("detail");
	};

	const handleCreate = () => {
		setActiveJob(null);
		setPanelMode("form");
	};

	const handleEdit = (row) => {
		setActiveJob(row);
		setPanelMode("form");
	};

	const handleRunNow = async (row) => {
		try {
			await post(`/jobs/${row.id}/run`);
			refresh();
		} catch {
			/* toast already shown */
		}
	};

	const handleDelete = (row) => setDeleteTarget(row);

	const confirmDelete = async () => {
		if (!deleteTarget) return;
		const id = deleteTarget.id;
		setDeleteTarget(null);
		try {
			await del(`/jobs/${id}`);
			setJobs((prev) => prev.filter((j) => j.id !== id));
			if (activeJob?.id === id) {
				setPanelMode(null);
				setActiveJob(null);
			}
		} catch {
			/* toast handled */
		}
	};

	const closePanel = () => {
		setPanelMode(null);
		setActiveJob(null);
	};

	const onSaved = (saved) => {
		if (saved?.id) {
			setJobs((prev) => {
				const exists = prev.some((j) => j.id === saved.id);
				return exists
					? prev.map((j) => (j.id === saved.id ? saved : j))
					: [saved, ...prev];
			});
		}
		refresh();
		closePanel();
	};

	return (
		<div className="mx-auto max-w-5xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">
					{strings("page.jobs.title")}
				</h1>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<button
						type="button"
						onClick={handleCreate}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
					>
						<i className="fa-solid fa-plus" aria-hidden />
						{strings("page.jobs.createNew")}
					</button>
				</div>
			</div>

			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			{(jobs?.length ?? 0) > 5 && (
				<SearchBar
					value={query}
					onChange={setQuery}
					placeholder={strings("page.jobs.searchPlaceholder")}
				/>
			)}

			{!loading && jobs.length === 0 ? (
				<EmptyState
					icon="fa-clock"
					title={strings("page.jobs.empty")}
					description={strings("page.jobs.emptyDesc")}
					action={
						<button
							type="button"
							onClick={handleCreate}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("page.jobs.createNew")}
						</button>
					}
				/>
			) : (
				<DataTable
					data={filtered}
					columns={jobsColumns({
						getTypeLabel,
						onRun: handleRunNow,
						onEdit: handleEdit,
						onDelete: handleDelete,
					})}
					getRowKey={(r) => r.id ?? r._id}
					onRowClick={handleRowClick}
					loading={loading}
				/>
			)}

			<SlidePanel
				isOpen={panelMode === "form"}
				onClose={closePanel}
				title={
					activeJob
						? strings("page.jobs.formEditTitle")
						: strings("page.jobs.formCreateTitle")
				}
			>
				<PanelHeader
					title={
						activeJob
							? strings("page.jobs.formEditTitle")
							: strings("page.jobs.formCreateTitle")
					}
					onClose={closePanel}
				/>
				<div className="px-6 py-6">
					<JobForm
						job={activeJob}
						definitions={definitions}
						onSaved={onSaved}
					/>
				</div>
			</SlidePanel>

			<SlidePanel
				isOpen={panelMode === "detail"}
				onClose={closePanel}
				title={strings("page.jobs.detailTitle")}
			>
				<PanelHeader
					title={activeJob?.name ?? strings("page.jobs.detailTitle")}
					onClose={closePanel}
				/>
				<div className="px-6 py-6">
					{activeJob && (
						<JobDetail
							job={activeJob}
							getTypeLabel={getTypeLabel}
							onChanged={(updated) => {
								setActiveJob(updated);
								setJobs((prev) =>
									prev.map((j) => (j.id === updated.id ? updated : j)),
								);
							}}
							onEdit={() => handleEdit(activeJob)}
							onDelete={() => setDeleteTarget(activeJob)}
						/>
					)}
				</div>
			</SlidePanel>

			<Modal
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				title={strings("confirm.deleteJob")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setDeleteTarget(null)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={confirmDelete}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700"
						>
							{strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.deleteJobBody", [deleteTarget?.name ?? ""])}
				</p>
			</Modal>
		</div>
	);
};

export default Jobs;
