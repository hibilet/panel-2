import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
	AsyncSearchInput,
	Input,
	Textarea,
} from "../../../../components/inputs";
import { linkSalesColumns } from "../../../../components/tables/columns";
import DataTable from "../../../../components/tables/DataTable";
import { get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const sortSalesByStart = (sales) =>
	[...(sales ?? [])]
		.filter((s) => !s.deletedAt)
		.sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

const defaultValues = { title: "", slug: "", description: "", image: "" };

const LinkPanel = ({ id, onClose, onSaved, onArchived }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [sales, setSales] = useState([]);
	const fileInputRef = useRef(null);

	const { register, handleSubmit, reset, setValue, watch } = useForm({
		defaultValues,
	});
	const formValues = watch();

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setError(null);
			setData(null);
			reset(defaultValues);
			setSales([]);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/links/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						title: d.title ?? "",
						slug: d.slug ?? "",
						description: d.description ?? "",
						image: d.image ?? "",
					});
					setSales(sortSalesByStart(d.sales ?? []));
				}
			})
			.catch((err) => setError(err?.message ?? strings("error.failedLoadLink")))
			.finally(() => setLoading(false));
	}, [id, isNew, reset]);

	const searchEvents = useCallback(async (q) => {
		const res = await get(`/sales/search?q=${encodeURIComponent(q)}&limit=20`);
		const items = res.data ?? [];
		return items
			.filter((s) => !s.deletedAt)
			.sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
	}, []);

	const handleAddSale = (sale) => {
		if (!sale?.id) return;
		if (sales.some((s) => s.id === sale.id)) return;
		setSales((prev) => sortSalesByStart([...prev, sale]));
	};

	const handleRemoveSale = (saleId) => (e) => {
		e.stopPropagation();
		if (!window.confirm(strings("form.link.confirmRemoveSale"))) return;
		setSales((prev) => prev.filter((s) => s.id !== saleId));
	};

	const onSave = async (formData) => {
		setSaving(true);
		setError(null);
		try {
			const linkData = {
				...formData,
				sales: sales.map((s) => s.id),
			};
			if (isNew) {
				const res = await post("/links", linkData);
				const created = res.data ?? null;
				setData(created);
				if (created?.id) {
					onSaved?.();
					onClose?.();
				}
			} else {
				await put(`/links/${id}`, { ...data, ...linkData });
				setData((prev) => (prev ? { ...prev, ...formData, sales } : null));
				onSaved?.();
				onClose?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const isArchived = data?.status === "archived";

	const onArchive = async () => {
		if (isNew || !data?.id) return;
		if (!window.confirm(strings("form.link.confirmArchive"))) return;
		setArchiving(true);
		setError(null);
		try {
			await put(`/links/${id}`, { status: "archived" });
			onArchived?.();
			onClose?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setArchiving(false);
		}
	};

	const onUnarchive = async () => {
		if (isNew || !data?.id) return;
		if (!window.confirm(strings("form.link.confirmUnarchive"))) return;
		setArchiving(true);
		setError(null);
		try {
			await put(`/links/${id}`, { status: "active" });
			setData((prev) => (prev ? { ...prev, status: "active" } : null));
			onArchived?.();
			onClose?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setArchiving(false);
		}
	};

	const handleImageUpload = (e) => {
		const f = e.target.files?.[0];
		if (f) {
			// TODO: upload to storage and get URL
			setValue("image", f.name);
		}
	};

	const formatStartDate = (iso) =>
		iso ? dayjs(iso).format("D MMM YYYY, HH:mm") : "—";
	const getVenueName = (sale) => sale?.venue?.name ?? sale?.venue ?? "—";

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{strings("page.links.details")}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-xl" aria-hidden />
				</button>
			</header>

			<div className="flex-1 overflow-y-auto p-6">
				{loading ? (
					<div className="flex flex-col gap-4">
						<div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
						<div className="h-64 animate-pulse rounded-lg bg-slate-100" />
					</div>
				) : error && !data && !isNew ? (
					<div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
						{error}
					</div>
				) : data || isNew ? (
					<main className="grid grid-cols-1">
						<section className="page-title">
							<h3 className="text-lg font-semibold text-slate-900">
								{isNew
									? strings("page.links.createNew")
									: formValues.title ||
										data?.title ||
										strings("common.untitled")}{" "}
								— {strings("page.links.details")}
							</h3>
						</section>

						<form onSubmit={handleSubmit(onSave)} className="space-y-6">
							{error && (
								<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
									{error}
								</div>
							)}

							<section className="grid grid-cols-1 gap-4">
								<fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Input
										label={strings("form.link.title")}
										{...register("title")}
										placeholder="Eg: Summer Festival 2024"
									/>
									<Input
										label={strings("form.link.slug")}
										{...register("slug")}
										placeholder="Eg: summer-festival-2024"
									/>
								</fieldset>

								{!isNew && (
									<fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<label
											htmlFor="link-views"
											className="block text-sm font-medium text-slate-700"
										>
											<span className="mb-1 block">
												{strings("form.link.views")}
											</span>
											<input
												id="link-views"
												type="number"
												disabled
												value={data?.views ?? 0}
												className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 opacity-60"
												readOnly
											/>
										</label>
									</fieldset>
								)}

								<fieldset className="grid grid-cols-1">
									<Textarea
										label={strings("form.link.description")}
										{...register("description")}
										placeholder="Eg: Join us for an amazing summer festival..."
									/>
								</fieldset>

								<fieldset className="grid grid-cols-1">
									<label className="block text-sm font-medium text-slate-700">
										{strings("form.link.image")}
									</label>
									<div className="mt-1 flex items-center gap-2">
										<input
											type="text"
											placeholder={strings("form.sale.uploadImagePlaceholder")}
											{...register("image")}
											className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
										/>
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleImageUpload}
										/>
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
										>
											{strings("form.sale.uploadImage")}
										</button>
										{formValues.image && (
											<img
												src={formValues.image}
												alt="Preview"
												className="h-12 w-12 shrink-0 rounded object-cover"
											/>
										)}
									</div>
								</fieldset>
							</section>

							<hr className="border-slate-200" />

							<section className="grid grid-cols-1">
								<span className="mb-2 block text-sm font-medium text-slate-700">
									{strings("form.link.sales")}
								</span>
								<div className="overflow-auto">
									<DataTable
										data={sales}
										columns={linkSalesColumns(
											formatStartDate,
											getVenueName,
											handleRemoveSale,
										)}
										getRowKey={(r) => r.id}
										bare
									/>
								</div>

								<div className="mt-4">
									<AsyncSearchInput
										label={strings("form.sale.eventName")}
										context="events"
										searchFn={searchEvents}
										onSelect={handleAddSale}
										placeholder={strings("form.sale.eventNamePlaceholder")}
										getOptionLabel={(s) =>
											`${s.name ?? "—"} · ${formatStartDate(s.start)} · ${getVenueName(s)}`
										}
									/>
								</div>
							</section>

							<hr className="border-slate-200" />

							<div className="flex items-center gap-2">
								<button
									type="submit"
									disabled={saving}
									className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
								>
									{saving ? (
										<>
											<i className="fa-solid fa-spinner fa-spin" aria-hidden />
											{strings("common.saving")}
										</>
									) : (
										strings("form.sale.save")
									)}
								</button>
								{!isNew && (
									<button
										type="button"
										onClick={isArchived ? onUnarchive : onArchive}
										disabled={archiving || saving}
										className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
									>
										{archiving ? (
											<>
												<i
													className="fa-solid fa-spinner fa-spin"
													aria-hidden
												/>
												{strings("common.saving")}
											</>
										) : isArchived ? (
											strings("common.unarchive")
										) : (
											strings("common.archive")
										)}
									</button>
								)}
							</div>
						</form>
					</main>
				) : null}
			</div>
		</div>
	);
};

export default LinkPanel;
