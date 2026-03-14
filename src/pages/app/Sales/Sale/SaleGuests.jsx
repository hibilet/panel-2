import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "wouter";
import * as XLSX from "xlsx";
import { Input, Select } from "../../../../components/inputs";
import { EmptyState, SlidePanel } from "../../../../components/shared";
import { guestColumns } from "../../../../components/tables/columns";
import DataTable from "../../../../components/tables/DataTable";
import Pagination from "../../../../components/tables/Pagination";
import { del, get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const LIMIT = 100;

const formatDate = (iso) => {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const getInitialForm = (guest, products = []) => {
	if (guest) {
		const productVal = guest.product ?? guest.productId ?? "";
		const productMatch = products.find(
			(p) =>
				p.name === productVal ||
				p.id === productVal ||
				p.category === productVal,
		);
		return {
			name: guest.name ?? "",
			email: guest.email ?? "",
			product: productMatch?.id ?? productVal ?? "",
			quantity: String(guest.count ?? 1),
		};
	}
	return {
		name: "",
		email: "",
		product: "",
		quantity: "1",
	};
};

const SaleGuests = ({ sale }) => {
	const { id } = useParams();
	const printRef = useRef(null);
	const isNew = id === "new";

	const [products, setProducts] = useState([]);
	const [guests, setGuests] = useState([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [panelGuest, setPanelGuest] = useState(null);
	const [saving, setSaving] = useState(null);
	const [deleting, setDeleting] = useState(null);

	const skip = (page - 1) * LIMIT;
	const panelOpen = panelGuest !== null;
	const isAdding = panelGuest === "new";

	const fetchGuests = useCallback(() => {
		if (isNew) return;
		setLoading(true);
		setError(null);
		get(`/sales/${id}/guests?limit=${LIMIT}&skip=${skip}`)
			.then((r) => {
				setGuests(r.data ?? []);
				setTotal(r.count ?? 0);
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadGuests")),
			)
			.finally(() => setLoading(false));
	}, [id, skip, isNew]);

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setGuests([]);
			setTotal(0);
			setProducts([]);
			return;
		}
		get(`/sales/${id}/products`)
			.then((r) =>
				setProducts(
					(r.data ?? []).sort(
						(a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999),
					),
				),
			)
			.catch(() => setProducts([]));
	}, [id, isNew]);

	useEffect(() => {
		if (isNew) return;
		fetchGuests();
	}, [fetchGuests, isNew]);

	const closePanel = useCallback(() => setPanelGuest(null), []);

	const handleSave = async (guest, formData) => {
		setSaving(guest?._id ?? guest?.id ?? "new");
		setError(null);
		try {
			const productId = formData.product || (products[0]?.id ?? "");
			const quantity = formData.quantity ? Number(formData.quantity) : 1;
			const data = {
				name: formData.name || undefined,
				email: formData.email || undefined,
				sale: id,
				products: Array.from({ length: quantity }, () => ({
					product: productId,
				})),
			};
			const guestId = guest?._id ?? guest?.id;
			if (guestId) {
				await put(`/giveaways/${guestId}`, data);
				await fetchGuests();
				closePanel();
			} else {
				await post("/giveaways", data);
				await fetchGuests();
				closePanel();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(null);
		}
	};

	const handleDelete = async (guestId) => {
		if (!confirm(strings("form.guest.confirmDelete"))) return;
		setDeleting(guestId);
		setError(null);
		try {
			await del(`/giveaways/${guestId}`);
			await fetchGuests();
			closePanel();
		} catch (err) {
			setError(err?.message ?? strings("error.failedDeleteGuest"));
		} finally {
			setDeleting(null);
		}
	};

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape" && panelOpen) closePanel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [panelOpen, closePanel]);

	const handlePrint = () => {
		if (!printRef.current) return;
		const printContent = printRef.current.innerHTML;
		const printWindow = window.open("", "_blank");
		printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strings("form.guest.printTitle", [sale?.name ?? strings("page.sale.title")])}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8">
          <h1 class="text-2xl font-bold mb-6">${strings("form.guest.printTitle", [sale?.name ?? strings("page.sale.title")])}</h1>
          <div class="guests-print">${printContent}</div>
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
			strings("form.guest.tableName"),
			strings("form.guest.tableEmail"),
			strings("form.guest.tableProduct"),
			strings("form.guest.tableQuantity"),
			strings("form.guest.tableCreated"),
		];
		const rows = guests.map((g) => [
			g.name ?? "",
			g.email ?? "",
			g.product ?? "",
			g.count ?? 0,
			formatDate(g.createdAt),
		]);
		const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Guests");
		const safeName = (sale?.name ?? id).replace(/[^a-zA-Z0-9-_]/g, "_");
		XLSX.writeFile(wb, `guests-${safeName}.xlsx`);
	};

	const totalQuantity = guests.reduce((sum, g) => sum + (g.count ?? 0), 0);

	if (loading && guests.length === 0 && !isNew) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
			</div>
		);
	}

	if (isNew) {
		return (
			<div className="relative">
				<div className="space-y-4">
					<div>
						<h2 className="text-lg font-medium text-slate-900">
							{strings("form.guest.title")}
						</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{strings("form.guest.saveFirstHint")}
						</p>
					</div>
					<EmptyState
						icon="fa-user-group"
						variant="amber"
						title={strings("form.guest.saveFirst")}
						description={strings("form.guest.noGuestsDescAlt")}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-medium text-slate-900">
							{strings("form.guest.title")}
						</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{guests.length === 1
								? strings("form.guest.count", [guests.length])
								: strings("form.guest.countPlural", [guests.length])}
							{totalQuantity > 0 && (
								<> · {strings("form.guest.totalTickets", [totalQuantity])}</>
							)}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => setPanelGuest("new")}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("form.guest.addGuest")}
						</button>
						<button
							type="button"
							onClick={handlePrint}
							disabled={loading || guests.length === 0}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							aria-label={strings("form.guest.ariaPrint")}
						>
							<i className="fa-solid fa-print" aria-hidden />
							{strings("form.guest.printPdf")}
						</button>
						<button
							type="button"
							onClick={handleDownloadExcel}
							disabled={loading || guests.length === 0}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							aria-label={strings("form.guest.ariaDownload")}
						>
							<i className="fa-solid fa-file-excel" aria-hidden />
							{strings("form.guest.downloadExcel")}
						</button>
					</div>
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				{guests.length === 0 ? (
					<EmptyState
						icon="fa-user-group"
						title={strings("form.guest.noGuests")}
						description={strings("form.guest.noGuestsDesc")}
						action={
							<button
								type="button"
								onClick={() => setPanelGuest("new")}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
							>
								<i className="fa-solid fa-plus" aria-hidden />
								{strings("form.guest.addGuest")}
							</button>
						}
					/>
				) : (
					<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
						<div ref={printRef} className="overflow-auto">
							<DataTable
								data={guests}
								columns={guestColumns(formatDate)}
								getRowKey={(r) => r._id ?? r.id}
								onRowClick={setPanelGuest}
								footer={
									<>
										<td
											colSpan={3}
											className="px-4 py-3 text-sm text-slate-500"
										/>
										<td className="px-4 py-3 text-sm font-medium text-slate-700">
											{totalQuantity} {strings("form.guest.total")}
										</td>
										<td />
									</>
								}
							/>
						</div>
						{/* <Pagination
							total={total}
							limit={LIMIT}
							page={page}
							onPageChange={setPage}
						/> */}
					</div>
				)}
			</div>

			<SlidePanel
				isOpen={panelOpen}
				onClose={closePanel}
				aria-label={
					isAdding
						? strings("form.guest.addGuest")
						: strings("form.guest.editGuest")
				}
			>
				<GuestPanel
					key={isAdding ? "new" : (panelGuest?._id ?? panelGuest?.id ?? "edit")}
					guest={isAdding ? null : panelGuest}
					products={products}
					onSave={handleSave}
					onDelete={handleDelete}
					onClose={closePanel}
					saving={saving}
					deleting={deleting}
				/>
			</SlidePanel>
		</div>
	);
};

const GuestPanel = ({
	guest,
	products,
	onSave,
	onDelete,
	onClose,
	saving,
	deleting,
}) => {
	const isNew = guest === null;
	const defaultValues = getInitialForm(guest, products);
	const { register, handleSubmit, reset } = useForm({ defaultValues });

	useEffect(() => {
		reset(getInitialForm(guest, products));
	}, [guest, products, reset]);

	const onFormSubmit = (formData) => {
		const productId = formData.product || (products[0]?.id ?? "");
		onSave(guest, {
			name: formData.name || undefined,
			email: formData.email || undefined,
			product: productId,
			quantity: formData.quantity ? Number(formData.quantity) : 1,
		});
	};

	const productOptions = products.map((p) => ({
		value: p.id,
		label: p.name ?? p.category ?? p.id,
	}));

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h3 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.guest.newGuest")
						: guest?.name || strings("form.guest.editGuest")}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form
				onSubmit={handleSubmit(onFormSubmit)}
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-5">
						<div className="space-y-4">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{strings("common.details")}
							</h4>
							<Input
								label={strings("form.guest.guestName")}
								{...register("name")}
								placeholder={strings("common.name")}
							/>
							<Input
								label={strings("form.guest.guestEmail")}
								type="email"
								{...register("email")}
								placeholder={strings("form.transaction.email")}
							/>
							<Select
								label={strings("form.guest.ticketType")}
								{...register("product")}
								placeholder={strings("form.guest.selectTicketType")}
								options={productOptions}
							/>
							<Input
								label={strings("form.guest.ticketQuantity")}
								type="number"
								min={1}
								{...register("quantity")}
								placeholder={strings("form.guest.tableQuantity")}
							/>
						</div>
					</div>
				</div>

				<footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<div className="flex flex-wrap gap-3">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.saving")}
								</>
							) : (
								<>
									{isNew
										? strings("form.guest.createGuest")
										: strings("form.ticket.saveChanges")}
								</>
							)}
						</button>
						{isNew ? (
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								{strings("common.cancel")}
							</button>
						) : (
							<button
								type="button"
								onClick={() => onDelete(guest?._id ?? guest?.id)}
								disabled={deleting}
								className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{deleting ? (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								) : (
									strings("common.delete")
								)}
							</button>
						)}
					</div>
				</footer>
			</form>
		</div>
	);
};

export default SaleGuests;
