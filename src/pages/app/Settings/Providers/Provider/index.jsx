import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Select } from "../../../../../components/inputs";
import { Modal } from "../../../../../components/shared";
import { del, get, post, put } from "../../../../../lib/client";
import strings from "../../../../../localization";

const COUNTRY_OPTIONS = [
	{ value: "TR", labelKey: "form.provider.countryTR" },
	{ value: "DE", labelKey: "form.provider.countryDE" },
	{ value: "NL", labelKey: "form.provider.countryNL" },
];

const CURRENCY_OPTIONS = [
	{ value: "EUR", labelKey: "form.provider.currencyEUR" },
	{ value: "TRY", labelKey: "form.provider.currencyTRY" },
	{ value: "USD", labelKey: "form.provider.currencyUSD" },
];

const TYPE_OPTIONS = [
	{ value: "provider.default", labelKey: "form.provider.typeDefault" },
	{ value: "provider.stripe", labelKey: "form.provider.typeStripe" },
];

const defaultValues = {
	name: "",
	bank: "",
	country: "",
	currency: "EUR",
	type: "",
	apiKey: "",
	apiSecret: "",
	webhookSecret: "",
};

const ProviderPanel = ({ id, onClose, onSaved, onDeleted, onProviderAdded, onProviderUpdated }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues });

	const showStripeFields = watch("type") === "provider.stripe";

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setData(null);
			reset(defaultValues);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/providers/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						bank: d.bank ?? "",
						country: d.country ?? "",
						currency: d.currency ?? "EUR",
						type: d.type ?? "",
						apiKey: d.apiKey ?? "",
						apiSecret: d.apiSecret ?? "",
						webhookSecret: d.webhookSecret ?? "",
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
				bank: formData.bank?.trim() || undefined,
				country: formData.country || undefined,
				currency: formData.currency || undefined,
				type: formData.type || undefined,
				apiKey: formData.apiKey?.trim() || undefined,
				apiSecret: formData.apiSecret?.trim() || undefined,
				webhookSecret: formData.webhookSecret?.trim() || undefined,
			};
			if (isNew) {
				const res = await post("/providers", payload);
				const created = res.data ?? null;
				setData(created);
				onProviderAdded?.(created);
				onSaved?.(created?.id);
			} else {
				const res = await put(`/providers/${id}`, payload);
				const updated = res.data ?? payload;
				setData((prev) => (prev ? { ...prev, ...updated } : null));
				onProviderUpdated?.(id, updated);
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
		setDeleteConfirmOpen(false);
		setDeleting(true);
		setError(null);
		try {
			await del(`/providers/${id}`);
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
						{isNew
							? strings("form.provider.newTitle")
							: strings("form.provider.editTitle")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
						aria-label={strings("common.ariaClose")}
					>
						<i className="fa-solid fa-xmark text-lg" aria-hidden />
					</button>
				</header>
				<div className="flex flex-1 items-center justify-center p-6">
					<i
						className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
						aria-hidden
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.provider.newTitle")
						: (data?.name ?? strings("form.provider.editTitle"))}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form
				onSubmit={handleSubmit(onSave)}
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-6">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
								{error}
							</div>
						)}

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={`${strings("form.provider.name")} *`}
								{...register("name", { required: strings("error.required") })}
								error={errors.name?.message}
								placeholder={strings("form.provider.namePlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={strings("form.provider.bank")}
								{...register("bank")}
								placeholder={strings("form.provider.bankPlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<Select
								label={strings("form.provider.country")}
								{...register("country")}
								placeholder={strings("form.provider.selectCountry")}
								options={COUNTRY_OPTIONS.map((o) => ({
									value: o.value,
									label: strings(o.labelKey),
								}))}
							/>
							<Select
								label={strings("form.provider.currency")}
								{...register("currency")}
								placeholder={strings("form.provider.selectCurrency")}
								options={CURRENCY_OPTIONS.map((o) => ({
									value: o.value,
									label: strings(o.labelKey),
								}))}
							/>
							<Select
								label={`${strings("form.provider.type")} *`}
								{...register("type", { required: strings("error.required") })}
								error={errors.type?.message}
								placeholder={strings("form.provider.selectType")}
								options={TYPE_OPTIONS.map((o) => ({
									value: o.value,
									label: strings(o.labelKey),
								}))}
							/>
						</div>

						{showStripeFields && (
							<>
								<hr className="border-slate-200" />
								<div className="grid grid-cols-1 gap-4">
									<Input
										label={strings("form.provider.apiKey")}
										type="text"
										{...register("apiKey")}
										placeholder={strings("form.provider.apiKeyPlaceholder")}
										autoComplete="off"
									/>
									<Input
										label={strings("form.provider.apiSecret")}
										type="password"
										{...register("apiSecret")}
										placeholder={strings("form.provider.apiSecretPlaceholder")}
										autoComplete="off"
									/>
									<Input
										label={strings("form.provider.webhookSecret")}
										type="password"
										{...register("webhookSecret")}
										placeholder={strings(
											"form.provider.webhookSecretPlaceholder",
										)}
										autoComplete="off"
									/>
								</div>
							</>
						)}
					</div>
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
					<div>
						{!isNew && (
							<button
								type="button"
								onClick={() => setDeleteConfirmOpen(true)}
								disabled={saving || deleting}
								className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label={strings("common.ariaDelete")}
							>
								{deleting ? (
									<>
										<i className="fa-solid fa-spinner fa-spin" aria-hidden />
										{strings("common.delete")}
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
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

			<Modal
				isOpen={deleteConfirmOpen}
				onClose={() => setDeleteConfirmOpen(false)}
				title={strings("confirm.deleteProvider")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setDeleteConfirmOpen(false)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={onDelete}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-700"
						>
							{strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.deleteProviderBody", [data?.name ?? ""])}
				</p>
			</Modal>
		</div>
	);
};

export default ProviderPanel;
