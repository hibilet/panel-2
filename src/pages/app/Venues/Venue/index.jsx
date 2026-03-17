import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { Input, Select } from "../../../../components/inputs";
import { get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const CATEGORY_OPTIONS = [
	{ value: "event-hall", label: "Event Hall" },
	{ value: "club", label: "Club" },
	{ value: "theater", label: "Theater" },
	{ value: "arena", label: "Arena" },
	{ value: "stadium", label: "Stadium" },
	{ value: "other", label: "Other" },
];

const defaultValues = {
	name: "",
	address: "",
	category: "",
	status: "active",
};

const VenuePanel = ({ id, onClose, onSaved }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset } = useForm({ defaultValues });

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setData(null);
			reset(defaultValues);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/venues/${id}`)
			.then((res) => {
				const d = res.data ?? res;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						address: d.address ?? "",
						category: d.category ?? "",
						status: d.status ?? "active",
					});
				}
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadVenues")),
			)
			.finally(() => setLoading(false));
	}, [id, isNew, reset]);

	const onSave = async (formData) => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: formData.name?.trim() || undefined,
				address: formData.address?.trim() || undefined,
				category: formData.category?.trim() || undefined,
				status: formData.status || undefined,
			};
			if (isNew) {
				const res = await post("/venues", payload);
				const created = res.data ?? null;
				setData(created);
				const newId = created?.id ?? created?._id;
				if (newId) onSaved?.(newId);
			} else {
				const res = await put(`/venues/${id}`, payload);
				setData((prev) =>
					prev ? { ...prev, ...(res.data ?? payload) } : (res.data ?? payload),
				);
				onSaved?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.venue.newTitle")
						: strings("page.venues.details")}
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
				) : error && !data ? (
					<div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
						{error}
					</div>
				) : (
					<form
						id="venue-form"
						onSubmit={handleSubmit(onSave)}
						className="space-y-4"
					>
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
								{error}
							</div>
						)}
						{!isNew && data?.owner && (
							<Link to={`/accounts/merchants/${data?.owner?.id}`}>	
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
									<p className="text-sm font-medium text-slate-500">
										{strings("form.venue.owner")}
									</p>
									<p className="mt-1 text-lg font-medium text-slate-900">
										{data?.owner?.name}
									</p>
								</div>
							</Link>
						)}
						<Input
							label={strings("form.venue.name")}
							{...register("name")}
							placeholder={strings("form.venue.namePlaceholder")}
						/>
						<Input
							label={strings("form.venue.address")}
							{...register("address")}
							placeholder={strings("form.venue.addressPlaceholder")}
						/>
						<Select
							label={strings("form.venue.category")}
							{...register("category")}
							options={CATEGORY_OPTIONS}
							placeholder={strings("form.venue.categoryPlaceholder")}
						/>
						<Select
							label={strings("form.venue.status")}
							{...register("status")}
							options={STATUS_OPTIONS}
						/>
					</form>
				)}
			</div>

			{!loading && (data || isNew) && (
				<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
					<button
						type="submit"
						form="venue-form"
						disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
					>
						{saving ? (
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
						) : (
							<i className="fa-solid fa-check" aria-hidden />
						)}
						{strings("common.save")}
					</button>
				</footer>
			)}
		</div>
	);
};

export default VenuePanel;
