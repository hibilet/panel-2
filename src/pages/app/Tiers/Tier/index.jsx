import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Checkbox, Input, Select } from "../../../../components/inputs";
import { del, get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const COMMISSION_TYPE_OPTIONS = [
	{ value: "percentage", label: strings("form.tier.commissionTypePercentage") },
	{ value: "fixed", label: strings("form.tier.commissionTypeFixed") },
];

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const defaultValues = {
	name: "",
	description: "",
	baseFee: 0,
	installFee: 0,
	saleLimit: 0,
	commissionAmount: 0,
	commissionType: "percentage",
	exclusive: false,
	status: "active",
};

const TierPanel = ({ id, onClose, onSaved, onDeleted }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
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
		get(`/tiers/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						description: d.description ?? "",
						baseFee: d.baseFee ?? 0,
						installFee: d.installFee ?? 0,
						saleLimit: d.saleLimit ?? 0,
						commissionAmount: d.commission?.amount ?? 0,
						commissionType: d.commission?.type ?? "percentage",
						exclusive: d.exclusive ?? false,
						status: d.status ?? "active",
					});
				}
			})
			.catch((err) => setError(err?.message ?? strings("error.failedLoad")))
			.finally(() => setLoading(false));
	}, [id, isNew, reset]);

	const onSave = async (formData) => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: formData.name?.trim() || undefined,
				description: formData.description?.trim() || undefined,
				baseFee: Number(formData.baseFee) || 0,
				installFee: Number(formData.installFee) || 0,
				saleLimit: Number(formData.saleLimit) || 0,
				commission: {
					amount: Number(formData.commissionAmount) || 0,
					type: formData.commissionType || "percentage",
				},
				exclusive: !!formData.exclusive,
				status: formData.status || "active",
			};
			if (isNew) {
				const res = await post("/tiers", payload);
				const created = res.data ?? null;
				setData(created);
				if (created?.id) onSaved?.(created.id);
			} else {
				await put(`/tiers/${id}`, payload);
				setData((prev) => (prev ? { ...prev, ...payload } : null));
				onSaved?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async () => {
		if (isNew || !data?.id) return;
		if (!window.confirm(strings("confirm.deleteTier"))) return;
		setDeleting(true);
		setError(null);
		try {
			await del(`/tiers/${id}`);
			onDeleted?.();
			onClose?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedDelete"));
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex h-full flex-col">
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
					<h2 className="text-lg font-semibold text-slate-900">
						{isNew ? strings("form.tier.newTitle") : strings("form.tier.editTitle")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label={strings("common.ariaClose")}
					>
						<i className="fa-solid fa-xmark text-lg" aria-hidden />
					</button>
				</header>
				<div className="flex flex-1 items-center justify-center p-6">
					<i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{isNew ? strings("form.tier.newTitle") : (data?.name ?? strings("form.tier.editTitle"))}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form onSubmit={handleSubmit(onSave)} className="flex flex-1 flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-6">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
								{error}
							</div>
						)}

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={strings("form.tier.name")}
								{...register("name")}
								placeholder={strings("form.tier.namePlaceholder")}
							/>
							<Input
								label={strings("form.tier.description")}
								{...register("description")}
								placeholder={strings("form.tier.descriptionPlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<Input
								label={strings("form.tier.baseFee")}
								type="number"
								step="0.01"
								min="0"
								{...register("baseFee", { valueAsNumber: true })}
								endAdornment="€"
							/>
							<Input
								label={strings("form.tier.installFee")}
								type="number"
								step="0.01"
								min="0"
								{...register("installFee", { valueAsNumber: true })}
								endAdornment="€"
							/>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={strings("form.tier.saleLimit")}
								type="number"
								min="0"
								{...register("saleLimit", { valueAsNumber: true })}
							/>
						</div>

						<hr className="border-slate-200" />

						<div className="grid grid-cols-2 gap-4">
							<Select
								label={strings("form.tier.commissionType")}
								{...register("commissionType")}
								options={COMMISSION_TYPE_OPTIONS}
							/>
							<Input
								label={strings("form.tier.commissionAmount")}
								type="number"
								step="0.01"
								min="0"
								{...register("commissionAmount", { valueAsNumber: true })}
							/>
						</div>

						<hr className="border-slate-200" />

						<div className="grid grid-cols-1 gap-4">
							<Select
								label={strings("form.tier.status")}
								{...register("status")}
								options={STATUS_OPTIONS}
							/>
							<Checkbox
								label={strings("form.tier.exclusive")}
								{...register("exclusive")}
							/>
						</div>
					</div>
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
					<div>
						{!isNew && (
							<button
								type="button"
								onClick={onDelete}
								disabled={saving || deleting}
								className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
								aria-label={strings("common.ariaDelete")}
							>
								{deleting ? (
									<>
										<i className="fa-solid fa-spinner fa-spin" aria-hidden />
										{strings("common.saving")}
									</>
								) : (
									<>
										<i className="fa-solid fa-trash" aria-hidden />
										{strings("common.delete")}
									</>
								)}
							</button>
						)}
					</div>
					<button
						type="submit"
						disabled={saving || deleting}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
					>
						{saving ? (
							<>
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								{strings("common.saving")}
							</>
						) : (
							<>
								<i className="fa-solid fa-floppy-disk" aria-hidden />
								{strings("common.save")}
							</>
						)}
					</button>
				</footer>
			</form>
		</div>
	);
};

export default TierPanel;
