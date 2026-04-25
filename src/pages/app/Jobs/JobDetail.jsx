import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { jobRunsColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import { get, post, put } from "../../../lib/client";
import strings from "../../../localization";

const formatDateTime = (d) =>
	d ? dayjs(d).format("D MMM YYYY, HH:mm") : "—";

const JobDetail = ({ job, getTypeLabel, onChanged, onEdit, onDelete }) => {
	const [runs, setRuns] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [running, setRunning] = useState(false);

	const loadRuns = useCallback(async () => {
		if (!job?.id) return;
		setLoading(true);
		try {
			const res = await get(`/jobs/${job.id}/runs?limit=50`);
			setRuns(res?.data ?? []);
			setError(null);
		} catch (err) {
			setError(err?.message ?? strings("error.failedLoadJobRuns"));
		} finally {
			setLoading(false);
		}
	}, [job?.id]);

	useEffect(() => {
		loadRuns();
	}, [loadRuns]);

	const handleRunNow = async () => {
		if (!job?.id) return;
		setRunning(true);
		try {
			await post(`/jobs/${job.id}/run`);
			loadRuns();
		} catch {
			/* toast handled */
		} finally {
			setRunning(false);
		}
	};

	const handleToggleEnabled = async () => {
		if (!job?.id) return;
		const next = !(job.enabled !== false);
		try {
			const res = await put(`/jobs/${job.id}`, { enabled: next });
			onChanged?.(res?.data ?? { ...job, enabled: next });
		} catch {
			/* toast handled */
		}
	};

	if (!job) return null;

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{strings("table.job.type")}
						</div>
						<div className="mt-1 text-sm font-medium text-slate-900">
							{getTypeLabel?.(job.type) ?? job.type}
						</div>
					</div>
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{strings("table.job.schedule")}
						</div>
						<div className="mt-1 font-mono text-sm text-slate-700">
							{job.schedule ?? (job.runAt ? formatDateTime(job.runAt) : "—")}
						</div>
					</div>
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{strings("table.job.nextRunAt")}
						</div>
						<div className="mt-1 text-sm text-slate-700">
							{job.enabled === false ? "—" : formatDateTime(job.nextRunAt)}
						</div>
					</div>
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{strings("table.job.lastStatus")}
						</div>
						<div className="mt-1 text-sm text-slate-700">
							{job.lastStatus ?? "—"}
						</div>
					</div>
				</div>

				{job.params && Object.keys(job.params).length > 0 && (
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{strings("page.jobs.params")}
						</div>
						<pre className="mt-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
							{JSON.stringify(job.params, null, 2)}
						</pre>
					</div>
				)}
			</div>

			<div className="flex flex-wrap gap-2">
				{!job.system && (
					<>
						<button
							type="button"
							onClick={handleRunNow}
							disabled={running}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{running ? (
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							) : (
								<i className="fa-solid fa-play" aria-hidden />
							)}
							{strings("page.jobs.runNow")}
						</button>
						<button
							type="button"
							onClick={handleToggleEnabled}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							<i
								className={`fa-solid ${job.enabled !== false ? "fa-pause" : "fa-play"}`}
								aria-hidden
							/>
							{job.enabled !== false
								? strings("page.jobs.disable")
								: strings("page.jobs.enable")}
						</button>
						<button
							type="button"
							onClick={onEdit}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							<i className="fa-solid fa-pen" aria-hidden />
							{strings("page.jobs.edit")}
						</button>
						<button
							type="button"
							onClick={onDelete}
							className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
						>
							<i className="fa-solid fa-trash" aria-hidden />
							{strings("page.jobs.delete")}
						</button>
					</>
				)}
			</div>

			<div>
				<h3 className="mb-3 text-sm font-semibold text-slate-900">
					{strings("page.jobs.runHistory")}
				</h3>
				{error && (
					<div
						className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
						role="alert"
					>
						{error}
					</div>
				)}
				<DataTable
					data={runs}
					columns={jobRunsColumns}
					getRowKey={(r) => r.id ?? r._id}
					loading={loading}
					emptyMessage={strings("page.jobs.runsEmpty")}
				/>
			</div>
		</div>
	);
};

export default JobDetail;
