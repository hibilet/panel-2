import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import * as XLSX from "xlsx";
import { Modal, PageHeader, SearchBar } from "../../../../components/shared";
import { attendeeColumns } from "../../../../components/tables/columns";
import DataTable from "../../../../components/tables/DataTable";
import Pagination from "../../../../components/tables/Pagination";
import { get, post } from "../../../../lib/client";
import { showToast } from "../../../../lib/toastStore";
import strings from "../../../../localization";
import { matchesQuery } from "../../../../utils/search";

const LIMIT = 10000;

const getAge = (birthday) => {
	if (!birthday) return "—";
	const birth = new Date(birthday);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const m = today.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
	return age;
};

const STATUS_LABELS = {
	success: `✅ ${strings("status.success")}`,
	read: `✅ ${strings("status.read")}`,
	reserved: `⏳ ${strings("status.reserved")}`,
	failed: `❌ ${strings("status.failed")}`,
};

const formatAnswerValue = (val) => {
	if (val === true) return "Yes";
	if (val === false) return "No";
	if (Array.isArray(val)) return val.join(", ");
	if (val === null || val === undefined) return "";
	return String(val);
};

const formatAnswers = (answers, questions = []) => {
	if (!answers?.length) return "—";
	const qMap = new Map(
		questions.map((q) => [q.id ?? q._id, q.question ?? "?"])
	);
	return answers
		.map((a) => {
			const label = qMap.get(a.question) ?? a.question?.slice(-6) ?? "?";
			const val = formatAnswerValue(a.answer);
			return val ? `${label}: ${val}` : null;
		})
		.filter(Boolean)
		.join("; ") || "—";
};

const CopyButton = ({ text, stopPropagation }) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async (e) => {
		if (stopPropagation) e.stopPropagation();
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
			aria-label={
				copied
					? strings("form.channel.copied")
					: strings("form.channel.copyLink")
			}
			title={strings("form.channel.copyLink")}
		>
			{copied ? (
				<i className="fa-solid fa-check text-emerald-600" aria-hidden />
			) : (
				<i className="fa-solid fa-copy" aria-hidden />
			)}
		</button>
	);
};

const getColumns = () => [
	...attendeeColumns(CopyButton),
	{
		key: "print",
		header: "✓",
		render: () => <span style={{ transform: "scale(2)" }}>☐</span>,
		printOnly: true,
	},
];

const RowDetail = ({ row, questions }) => {
	const answers = row.answers ?? [];
	if (!answers.length) return null;

	const qMap = new Map(
		questions.map((q) => [q.id ?? q._id, q.question ?? "?"])
	);

	return (
		<div className="space-y-1.5 pl-12">
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-600">
				{answers
					.filter((a) => {
						const v = formatAnswerValue(a.answer);
						return v != null && v !== "";
					})
					.map((a) => {
						const label =
							qMap.get(a.question) ?? a.question?.slice(-6) ?? "?";
						const val = formatAnswerValue(a.answer);
						return (
							<span key={a._id} className="contents">
								<dt className="font-medium text-slate-500">{label}</dt>
								<dd>{val}</dd>
							</span>
						);
					})}
			</dl>
		</div>
	);
};

const SaleAttendees = ({ sale }) => {
	const questions = sale?.questions ?? [];
	const columns = getColumns();
	const { id } = useParams();
	const printRef = useRef(null);

	const [reservations, setReservations] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [expandedRowKeys, setExpandedRowKeys] = useState(new Set());
	const [query, setQuery] = useState("");
	const printRequestedRef = useRef(false);

	const skip = (page - 1) * LIMIT;

	const filteredReservations = useMemo(
		() => reservations.filter((r) => matchesQuery(r.owner, query)),
		[reservations, query],
	);

	const rowsWithDetails = reservations.filter((r) => r.answers?.length);
	const allExpanded =
		rowsWithDetails.length > 0 &&
		rowsWithDetails.every((r) => expandedRowKeys.has(r.id));
	const someHaveDetails = rowsWithDetails.length > 0;

	const handleRevealAll = () => {
		if (allExpanded) {
			setExpandedRowKeys(new Set());
		} else {
			setExpandedRowKeys(new Set(rowsWithDetails.map((r) => r.id)));
		}
	};

	const fetchReservations = useCallback(() => {
		setLoading(true);
		setError(null);
		get(
			`/sales/${id}/reservations?status=success,read&limit=${LIMIT}&skip=${skip}`,
		)
			.then((r) => {
				setReservations(r.data ?? []);
				setTotal(r.count ?? 0);
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadAttendees")),
			)
			.finally(() => setLoading(false));
	}, [id, skip]);

	useEffect(() => {
		fetchReservations();
	}, [fetchReservations]);

	const handlePrint = () => {
		setExpandedRowKeys(new Set(rowsWithDetails.map((r) => r.id)));
		printRequestedRef.current = true;
	};

	useEffect(() => {
		if (!printRequestedRef.current || !printRef.current) return;
		printRequestedRef.current = false;

		const captureAndPrint = () => {
			if (!printRef.current) return;
			const printContent = printRef.current.innerHTML;
			const printWindow = window.open("", "_blank");
			// Pop-up blockers return null here; writing to it throws and the
			// print silently does nothing.
			if (!printWindow) {
				showToast("error", strings("error.popupBlocked"));
				return;
			}
			printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strings("form.attendees.printTitle", [sale?.name ?? strings("page.sale.title")])}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            .print-only{display:table-cell!important}
            @media print{.print\\:hidden{display:none!important}}
          </style>
        </head>
        <body class="p-8">
          <h1 class="text-2xl font-bold mb-6">${strings("form.attendees.printTitle", [sale?.name ?? strings("page.sale.title")])}</h1>
          <div class="attendees-print">${printContent}</div>
        </body>
      </html>
    `);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 250);
		};

		const t = setTimeout(captureAndPrint, 100);
		return () => clearTimeout(t);
	}, [expandedRowKeys, sale?.name]);

	const [exporting, setExporting] = useState(false);
	const [resendOpen, setResendOpen] = useState(false);

	// Export one row per ticket (reservation), not one row per attendee block, so
	// each seat/ticket is importable elsewhere. Pulls the flat endpoint which
	// carries seat + price the grouped attendee view drops.
	const handleDownloadExcel = async () => {
		setExporting(true);
		try {
			// The API caps every list page at 500 rows, so page through until a
			// short page - a large event has thousands of tickets and the export
			// must carry all of them, not the first 500.
			const PAGE = 500;
			const data = [];
			for (let skipRows = 0; ; skipRows += PAGE) {
				const r = await get(
					`/sales/${id}/reservations/export?status=success,read&limit=${PAGE}&skip=${skipRows}`,
				);
				const page = r.data ?? [];
				data.push(...page);
				if (page.length < PAGE) break;
			}
			const headers = [
				"Ticket ID",
				strings("table.transaction.owner"),
				strings("form.transaction.email"),
				strings("form.attendees.product"),
				"Seat",
				"Price",
				"Gender",
				"Age",
				strings("common.status"),
				strings("page.transactions.transactionId"),
				strings("form.question.question") + "s",
			];
			const rows = data.map((res) => [
				res.id ? String(res.id) : "",
				res.owner ?? "",
				res.email ?? "",
				res.product ?? "",
				res.seat ?? "",
				res.price ?? "",
				res.gender
					? String(res.gender).charAt(0).toUpperCase() +
						String(res.gender).slice(1)
					: "",
				res.age ?? getAge(res.birthday) ?? "",
				STATUS_LABELS[res.status] ?? res.status ?? "",
				res.transaction ? String(res.transaction) : "",
				formatAnswers(res.answers, sale?.questions ?? []),
			]);
			const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Tickets");
			const safeName = (sale?.name ?? id).replace(/[^a-zA-Z0-9-_]/g, "_");
			XLSX.writeFile(wb, `tickets-${safeName}.xlsx`);
		} catch (err) {
			showToast("error", err?.message ?? strings("error.failedLoadAttendees"));
		} finally {
			setExporting(false);
		}
	};

	// The batch runs as a background job (25 baskets per tick); the modal
	// confirms, kicks it off, then polls resend-status so the operator watches it
	// drain instead of firing blind from a toast.
	const handleResendTickets = () => setResendOpen(true);

	const handleRowClick = (row) => {
		if (row.transaction) {
			window.open(`/transactions/${row.transaction}`, "_blank");
		} else {
			setExpandedRowKeys((prev) => {
				const next = new Set(prev);
				if (next.has(row.id)) {
					next.delete(row.id);
				} else {
					next.add(row.id);
				}
				return next;
			});
		}
	};

	const actions = (
		<div className="flex gap-2">
			<button
				type="button"
				onClick={handleRevealAll}
				disabled={loading || !someHaveDetails}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				aria-label={allExpanded ? "Hide Answers" : "Reveal Answers"}
				title={allExpanded ? "Hide Answers" : "Reveal Answers"}
			>
				<i
					className={`fa-solid ${allExpanded ? "fa-chevrons-up" : "fa-chevrons-down"}`}
					aria-hidden
				/>
				{allExpanded ? "Hide Answers" : "Reveal Answers"}
			</button>
			<button
				type="button"
				onClick={handlePrint}
				disabled={loading || reservations.length === 0}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				aria-label={strings("form.attendees.ariaPrint")}
			>
				<i className="fa-solid fa-print" aria-hidden />
				{strings("form.attendees.printPdf")}
			</button>
			<button
				type="button"
				onClick={handleDownloadExcel}
				disabled={loading || exporting || reservations.length === 0}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				aria-label={strings("form.attendees.ariaDownload")}
			>
				<i
					className={`fa-solid ${exporting ? "fa-spinner fa-spin" : "fa-file-excel"}`}
					aria-hidden
				/>
				{strings("form.attendees.downloadExcel")}
			</button>
			<button
				type="button"
				onClick={handleResendTickets}
				disabled={loading || reservations.length === 0}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				aria-label="Resend all tickets"
				title="Resend all tickets"
			>
				<i className="fa-solid fa-paper-plane" aria-hidden />
				Resend tickets
			</button>
		</div>
	);

	if (loading && reservations.length === 0) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl">
			<PageHeader title={strings("form.attendees.title")} actions={actions} />

			<div className="mt-4">
				<SearchBar
					value={query}
					onChange={setQuery}
					placeholder={strings("form.attendees.searchPlaceholder")}
				/>
			</div>

			{error && (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="mt-6 overflow-auto rounded-lg border border-slate-200 bg-white">
				<DataTable
					data={filteredReservations}
					columns={columns}
					getRowKey={(r) => r.id}
					loading={loading}
					emptyMessage={strings("form.attendees.noAttendees")}
					tableRef={printRef}
					expandedRowKeys={Array.from(expandedRowKeys)}
					onExpandedChange={(s) => setExpandedRowKeys(s)}
					onRowClick={handleRowClick}
					renderRowDetail={(row) =>
						row.answers?.length ? (
							<RowDetail row={row} questions={questions} />
						) : null
					}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>

			{resendOpen && (
				<ResendTicketsModal
					saleId={id}
					total={total}
					onClose={() => setResendOpen(false)}
				/>
			)}
		</div>
	);
};

// Confirms, kicks off the background resend job, then polls resend-status so the
// batch drains visibly. The job runs server-side regardless of this modal, so
// closing mid-run does not stop the send - it just stops watching.
const ResendTicketsModal = ({ saleId, total, onClose }) => {
	const [phase, setPhase] = useState("confirm"); // confirm | running | done | error
	const [status, setStatus] = useState(null);
	const [errMsg, setErrMsg] = useState(null);
	const timer = useRef(null);

	const stopPoll = () => {
		if (timer.current) {
			clearInterval(timer.current);
			timer.current = null;
		}
	};

	const poll = useCallback(async () => {
		try {
			const r = await get(`/sales/${saleId}/resend-status`);
			const data = r?.data ?? null;
			setStatus(data);
			// Our POST armed the job (running=true); it clears nextRunAt once the
			// final empty page finishes. running===false with a job present is done.
			if (data?.job && data.job.running === false) {
				stopPoll();
				setPhase("done");
			}
		} catch {
			// Transient network blip - keep polling.
		}
	}, [saleId]);

	// Attach to an already-running resend on open, so reopening shows live
	// progress instead of offering to start a second one.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const r = await get(`/sales/${saleId}/resend-status`);
				const data = r?.data ?? null;
				if (cancelled) return;
				setStatus(data);
				if (data?.job?.running) {
					setPhase("running");
					timer.current = setInterval(poll, 1500);
				}
			} catch {
				/* stay on the confirm step */
			}
		})();
		return () => {
			cancelled = true;
			stopPoll();
		};
	}, [saleId, poll]);

	const start = async () => {
		setPhase("running");
		setErrMsg(null);
		try {
			await post(`/sales/${saleId}/resend-tickets`, {});
			await poll();
			timer.current = setInterval(poll, 1500);
		} catch (err) {
			stopPoll();
			setErrMsg(err?.message ?? "Failed to start resend.");
			setPhase("error");
		}
	};

	const p = status?.job?.progress ?? null;
	const totalCount = status?.total ?? total ?? 0;
	const processed = p?.processed ?? 0;
	const pct = totalCount
		? Math.min(100, Math.round((processed / totalCount) * 100))
		: 0;

	const Stat = ({ label, value, tone = "text-slate-900" }) => (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
			<div className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
			<div className="text-xs text-slate-500">{label}</div>
		</div>
	);

	const footer = (
		<div className="flex justify-end gap-2">
			{phase === "confirm" ? (
				<>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
					>
						{strings("common.cancel")}
					</button>
					<button
						type="button"
						onClick={start}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
					>
						<i className="fa-solid fa-paper-plane" aria-hidden />
						Start resend
					</button>
				</>
			) : (
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					{phase === "running" ? "Close (keeps running)" : strings("common.close")}
				</button>
			)}
		</div>
	);

	return (
		<Modal isOpen onClose={onClose} title="Resend tickets" maxWidth="md" footer={footer}>
			{phase === "confirm" && (
				<p className="text-sm text-slate-600">
					Resend the ticket email to all{" "}
					<span className="font-semibold text-slate-900">{totalCount}</span>{" "}
					attendees of this event? Each attendee gets their tickets again.
				</p>
			)}

			{phase === "error" && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
					{errMsg}
				</div>
			)}

			{(phase === "running" || phase === "done") && (
				<div className="space-y-4">
					<div className="flex items-center justify-between text-sm">
						<span className="font-medium text-slate-700">
							{phase === "done" ? (
								<span className="text-emerald-700">
									<i className="fa-solid fa-circle-check mr-1.5" aria-hidden />
									Resend complete
								</span>
							) : (
								<span>
									<i className="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden />
									Sending…
								</span>
							)}
						</span>
						<span className="tabular-nums text-slate-500">
							{processed}/{totalCount}
						</span>
					</div>

					<div className="h-2 overflow-hidden rounded-full bg-slate-100">
						<div
							className={`h-full rounded-full transition-all duration-500 ${
								phase === "done" ? "bg-emerald-500" : "bg-slate-900"
							}`}
							style={{ width: `${pct}%` }}
						/>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<Stat label="Sent" value={p?.sent ?? 0} tone="text-emerald-700" />
						<Stat label="Skipped" value={p?.skipped ?? 0} tone="text-slate-500" />
						<Stat
							label="Failed"
							value={p?.failed ?? 0}
							tone={(p?.failed ?? 0) > 0 ? "text-red-600" : "text-slate-900"}
						/>
					</div>

					{(p?.errors?.length ?? 0) > 0 && (
						<details className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
							<summary className="cursor-pointer font-medium text-red-700">
								{p.errors.length} error{p.errors.length > 1 ? "s" : ""}
							</summary>
							<ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-red-600">
								{p.errors.slice(0, 50).map((e) => (
									<li key={e.basket} className="truncate">
										{e.basket}: {e.error}
									</li>
								))}
							</ul>
						</details>
					)}

					{(p?.skippedList?.length ?? 0) > 0 && (
						<details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
							<summary className="cursor-pointer font-medium text-slate-600">
								{p.skippedList.length} skipped
							</summary>
							<ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-500">
								{p.skippedList.slice(0, 50).map((s) => (
									<li key={s.basket} className="truncate">
										{s.basket}:{" "}
										{s.reason === "no-basket"
											? "order data missing (orphaned basket)"
											: s.reason === "no-email"
												? "no email on order"
												: "no tickets to send (refunded/transferred)"}
									</li>
								))}
							</ul>
						</details>
					)}

					{phase === "running" && (
						<p className="text-xs text-slate-400">
							Runs in the background (25 at a time). Safe to close - it keeps
							going, and reopening shows progress.
						</p>
					)}
				</div>
			)}
		</Modal>
	);
};

export default SaleAttendees;
