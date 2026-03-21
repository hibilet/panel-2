import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import * as XLSX from "xlsx";
import { PageHeader } from "../../../../components/shared";
import { attendeeColumns } from "../../../../components/tables/columns";
import DataTable from "../../../../components/tables/DataTable";
import Pagination from "../../../../components/tables/Pagination";
import { get } from "../../../../lib/client";
import strings from "../../../../localization";

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

const columns = [
	...attendeeColumns(CopyButton),
	{
		key: "print",
		header: "✓",
		render: () => <span style={{ transform: "scale(2)" }}>☐</span>,
		printOnly: true,
	},
];

const SaleAttendees = ({ sale }) => {
	const { id } = useParams();
	const printRef = useRef(null);

	const [reservations, setReservations] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const skip = (page - 1) * LIMIT;

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
		if (!printRef.current) return;
		const printContent = printRef.current.innerHTML;
		const printWindow = window.open("", "_blank");
		printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strings("form.attendees.printTitle", [sale?.name ?? strings("page.sale.title")])}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>.print-only{display:table-cell!important}</style>
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

	const handleDownloadExcel = () => {
		const headers = [
			strings("table.transaction.owner"),
			strings("form.transaction.email"),
			strings("form.attendees.product"),
			strings("page.sale.tab.tickets"),
			"Gender",
			"Age",
			strings("common.status"),
			strings("page.transactions.transactionId"),
		];
		const rows = reservations.map((r) => [
			r.owner ?? "",
			r.email ?? "",
			r.product ?? "",
			r.tickets ?? "",
			r.gender
				? String(r.gender).charAt(0).toUpperCase() + String(r.gender).slice(1)
				: "",
			r.age ?? getAge(r.birthday) ?? "",
			STATUS_LABELS[r.status] ?? r.status ?? "",
			r.transaction ? String(r.transaction).slice(-6) : "",
		]);
		const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Attendees");
		const safeName = (sale?.name ?? id).replace(/[^a-zA-Z0-9-_]/g, "_");
		XLSX.writeFile(wb, `attendees-${safeName}.xlsx`);
	};

	const actions = (
		<div className="flex gap-2">
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
				disabled={loading || reservations.length === 0}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
				aria-label={strings("form.attendees.ariaDownload")}
			>
				<i className="fa-solid fa-file-excel" aria-hidden />
				{strings("form.attendees.downloadExcel")}
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

			{error && (
				<div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="mt-6 overflow-auto rounded-lg border border-slate-200 bg-white">
				<DataTable
					data={reservations}
					columns={columns}
					getRowKey={(r) => r.id}
					loading={loading}
					emptyMessage={strings("form.attendees.noAttendees")}
					tableRef={printRef}
				/>
				<Pagination
					total={total}
					limit={LIMIT}
					page={page}
					onPageChange={setPage}
				/>
			</div>
		</div>
	);
};

export default SaleAttendees;
