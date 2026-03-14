import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "wouter";
import { Input, Select } from "../../../../components/inputs";
import { EmptyState, SlidePanel } from "../../../../components/shared";
import { ticketColumns } from "../../../../components/tables/columns";
import DataTable from "../../../../components/tables/DataTable";
import { del, get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";
import { toId } from "../../../../utils/object";
import SaleEventSeating from "./SaleEventSeating";

const getInitialForm = (product) => {
	if (product) {
		return {
			name: product.name ?? "",
			promo: product.promo ?? "",
			stock: String(product.stock ?? ""),
			productsToDeliver: String(product.productsToDeliver ?? ""),
			price: String(product.price ?? ""),
			status: product.status ?? "active",
		};
	}
	return {
		name: "",
		promo: "",
		stock: "",
		productsToDeliver: "",
		price: "",
		status: "active",
	};
};

const SaleTickets = ({ sale, setSale }) => {
	const { id } = useParams();
	const isNew = id === "new";

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(!isNew);
	const [error, setError] = useState(null);
	const [panelProduct, setPanelProduct] = useState(null);
	const [saving, setSaving] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [seatingProduct, setSeatingProduct] = useState(null);

	const panelOpen = panelProduct !== null;
	const isAdding = panelProduct === "new";

	const closePanel = useCallback(() => setPanelProduct(null), []);

	useEffect(() => {
		if (isNew) {
			setProducts([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		get(`/sales/${id}/products`)
			.then((r) =>
				setProducts(
					(r.data ?? []).sort(
						(a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999),
					),
				),
			)
			.catch(() => setProducts([]))
			.finally(() => setLoading(false));
	}, [id, isNew]);

	const handleSave = async (product, payload) => {
		setSaving(product?.id ?? "new");
		setError(null);
		try {
			if (product?.id) {
				await put(`/products/${product.id}`, {
					...payload,
					type: "product.event",
				});
				setProducts((prev) =>
					prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p)),
				);
				closePanel();
			} else {
				const res = await post("/products", {
					...payload,
					sale: id,
					type: "product.event",
				});
				setProducts((prev) => [...prev, res.data ?? res]);
				closePanel();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(null);
		}
	};

	const handleDelete = async (productId) => {
		if (!confirm(strings("confirm.deleteTicket"))) return;
		setDeleting(productId);
		setError(null);
		try {
			await del(`/products/${productId}`);
			setProducts((prev) => prev.filter((p) => p.id !== productId));
			closePanel();
		} catch (err) {
			setError(err?.message ?? strings("error.failedDelete"));
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

	const totals = products.reduce(
		(acc, p) => ({
			stock: acc.stock + (p.stock ?? 0),
			reserved: acc.reserved + (p.reservations ?? 0),
			read: acc.read + (p.read ?? 0),
		}),
		{ stock: 0, reserved: 0, read: 0 },
	);

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="space-y-2">
					{[1, 2, 3, 4, 5, 6, 7].map((i) => (
						<div
							key={i}
							className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
						/>
					))}
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
							{strings("form.ticket.ticketTypes")}
						</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{products.length === 1
								? strings("form.ticket.ticketTypeCount", [products.length])
								: strings("form.ticket.ticketTypeCountPlural", [
										products.length,
									])}
							{totals.stock > 0 && (
								<> · {strings("form.ticket.totalCapacity", [totals.stock])}</>
							)}
						</p>
					</div>
					{!isNew && (
						<button
							type="button"
							onClick={() => setPanelProduct("new")}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("form.ticket.addTicketType")}
						</button>
					)}
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				{isNew ? (
					<EmptyState
						icon="fa-ticket"
						variant="amber"
						title={strings("form.ticket.saveFirst")}
						description={strings("form.ticket.saveFirstDesc")}
					/>
				) : products.length === 0 ? (
					<EmptyState
						icon="fa-ticket"
						title={strings("form.ticket.noTicketTypes")}
						description={strings("form.ticket.noTicketTypesDesc")}
						action={
							<button
								type="button"
								onClick={() => setPanelProduct("new")}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
							>
								<i className="fa-solid fa-plus" aria-hidden />
								{strings("form.ticket.addTicketType")}
							</button>
						}
					/>
				) : (
					<>
						<DataTable
							data={products}
							columns={ticketColumns}
							getRowKey={(r) => r.id}
							onRowClick={setPanelProduct}
						/>

						{totals.stock > 0 && (
							<div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm">
								<span className="font-medium text-slate-700">
									{strings("form.ticket.totalCapacityLabel", [totals.stock])}
								</span>
								<span className="text-slate-600">
									{strings("form.ticket.reservationsLabel", [totals.reserved])}
								</span>
								<span className="text-slate-600">
									{strings("form.ticket.readLabel", [totals.read])}
								</span>
							</div>
						)}
					</>
				)}
			</div>

			<SlidePanel
				isOpen={panelOpen}
				onClose={closePanel}
				title={
					isAdding
						? strings("form.ticket.addTicketTypePanel")
						: strings("form.ticket.editTicketTypePanel")
				}
			>
				<ProductPanel
					key={isAdding ? "new" : (panelProduct?.id ?? "edit")}
					product={isAdding ? null : panelProduct}
					sale={sale}
					onSave={handleSave}
					onDelete={handleDelete}
					onClose={closePanel}
					onOpenSeating={setSeatingProduct}
					saving={saving}
					deleting={deleting}
				/>
			</SlidePanel>

			<SaleEventSeating
				product={seatingProduct}
				sale={sale}
				plan={sale?.plan}
				onClose={() => setSeatingProduct(null)}
				onSave={(updatedSale) => {
					setSale?.(updatedSale);
					setSeatingProduct(null);
				}}
			/>
		</div>
	);
};

const ProductPanel = ({
	product,
	sale,
	onSave,
	onDelete,
	onClose,
	onOpenSeating,
	saving,
	deleting,
}) => {
	const isNew = product === null;
	const defaultValues = getInitialForm(product);
	const { register, handleSubmit, reset } = useForm({ defaultValues });

	useEffect(() => {
		reset(getInitialForm(product));
	}, [product, reset]);

	const onFormSubmit = (formData) => {
		const payload = {
			name: formData.name || undefined,
			promo: formData.promo || undefined,
			stock: formData.stock ? Number(formData.stock) : undefined,
			productsToDeliver: formData.productsToDeliver
				? Number(formData.productsToDeliver)
				: undefined,
			price: formData.price ? Number(formData.price) : undefined,
			status: formData.status || "active",
		};
		onSave(product, payload);
	};

	const hasReservations = (product?.reservations ?? 0) > 0;
	const seatCount = product?.stock ?? 0;
	const selectedSeatCount = (sale?.seating?.[product?.id] || []).length;

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h3 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.ticket.newTicketType")
						: product?.name || strings("form.ticket.editTicket")}
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
								label={strings("common.name")}
								{...register("name")}
								placeholder={strings("form.ticket.namePlaceholder")}
							/>
							<Input
								label={strings("form.ticket.promoText")}
								{...register("promo")}
								placeholder={strings("form.ticket.promoPlaceholder")}
							/>
						</div>

						<div className="space-y-4">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{strings("form.ticket.capacityPricing")}
							</h4>
							<div className="grid grid-cols-2 gap-4">
								<Input
									label={strings("table.ticket.stock")}
									type="number"
									{...register("stock")}
									placeholder={strings("form.ticket.stockPlaceholder")}
								/>
								<Input
									label={strings("form.ticket.ticketsToDeliver")}
									type="number"
									{...register("productsToDeliver")}
									placeholder="1"
								/>
							</div>
							<Input
								label={strings("table.ticket.price")}
								type="number"
								step="0.01"
								{...register("price")}
								placeholder={strings("form.ticket.pricePlaceholder")}
							/>
						</div>

						<div className="space-y-4">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{strings("common.status")}
							</h4>
							<Select
								label={strings("form.ticket.visibility")}
								{...register("status")}
								options={[
									{
										value: "active",
										label: strings("form.ticket.visibilityActive"),
									},
									{
										value: "inactive",
										label: strings("form.ticket.visibilityInactive"),
									},
								]}
							/>
						</div>

						{product &&
							seatCount > 0 &&
							toId(sale?.plan) && (
								<button
									type="button"
									onClick={() => onOpenSeating?.(product)}
									className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
								>
									<i
										className="fa-solid fa-armchair"
										aria-hidden
									/>
									{strings("form.ticket.selectSeats", [
										selectedSeatCount,
									])}
								</button>
							)}
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
										? strings("form.ticket.createTicketType")
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
								onClick={() => onDelete(product.id)}
								disabled={deleting || hasReservations}
								className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
								title={
									hasReservations
										? strings("form.ticket.cannotDeleteReservations")
										: strings("common.delete")
								}
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

export default SaleTickets;
