import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Select } from "../../../../components/inputs";
import { Modal } from "../../../../components/shared";
import { CAPABILITIES, UNLIMITED } from "../../../../lib/capabilities";
import { del, get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const ACL_KEYS = Object.keys(CAPABILITIES);

// react-hook-form treats dots in field names as nested paths, so a key like
// "reporting.sales" becomes acl.reporting.sales (3 levels). Read/write helpers
// walk that path so the surface API can stay flat (keyed by capability id).
const aclPath = (key) => `acl.${key}`;
const readAcl = (acl, key) => {
	if (!acl) return undefined;
	let v = acl;
	for (const p of key.split(".")) {
		if (v == null) return undefined;
		v = v[p];
	}
	return v;
};
const writeAcl = (target, key, value) => {
	const parts = key.split(".");
	let v = target;
	for (let i = 0; i < parts.length - 1; i += 1) {
		v[parts[i]] = v[parts[i]] || {};
		v = v[parts[i]];
	}
	v[parts[parts.length - 1]] = value;
	return target;
};
const buildDefaultAcl = () =>
	ACL_KEYS.reduce((acc, k) => writeAcl(acc, k, CAPABILITIES[k].default), {});
const defaultAcl = buildDefaultAcl();

const COMMISSION_TYPE_OPTIONS = [
	{ value: "percentage", label: strings("form.tier.commissionTypePercentage") },
	{ value: "fixed", label: strings("form.tier.commissionTypeFixed") },
];

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const VISIBILITY_OPTIONS = [
	{ value: "public", label: strings("form.tier.visibilityPublic") },
	{ value: "private", label: strings("form.tier.visibilityPrivate") },
];

const REPORTING_TYPES = ["sales", "churn"];
const REPORTING_FREQS = ["daily", "weekly", "monthly"];
const defaultReporting = {
	sales: { daily: 0, weekly: 0, monthly: 0 },
	churn: { daily: 0, weekly: 0, monthly: 0 },
	cron: { daily: "", weekly: "", monthly: "" },
};

const defaultValues = {
	name: "",
	description: "",
	baseFee: 0,
	installFee: 0,
	saleLimit: 0,
	commissionAmount: 0,
	commissionType: "percentage",
	visibility: "public",
	accessCode: "",
	status: "active",
	acl: defaultAcl,
	reporting: defaultReporting,
};

const TierPanel = ({ id, onClose, onSaved, onDeleted }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues });
	const aclValues = watch("acl") ?? {};
	const visibility = watch("visibility");
	const accessCode = watch("accessCode");
	const [rotating, setRotating] = useState(false);
	const [accessCodeCopied, setAccessCodeCopied] = useState(false);

	const setAllAcl = (mode) => {
		ACL_KEYS.forEach((k) => {
			const spec = CAPABILITIES[k];
			let value;
			if (mode === "enable") value = spec.type === "bool" ? true : UNLIMITED;
			else if (mode === "disable") value = spec.type === "bool" ? false : 0;
			else value = spec.default;
			setValue(aclPath(k), value, { shouldDirty: true });
		});
	};

	const onCopyAccessCode = async () => {
		if (!accessCode) return;
		try {
			await navigator.clipboard.writeText(accessCode);
			setAccessCodeCopied(true);
			setTimeout(() => setAccessCodeCopied(false), 1500);
		} catch {
			// ignore - permission denied
		}
	};

	const onRotateAccessCode = async () => {
		if (isNew || !id) return;
		setRotating(true);
		setError(null);
		try {
			const res = await post(`/tiers/${id}/rotate-access-code`, {});
			const next = res?.data;
			if (next?.accessCode) {
				setValue("accessCode", next.accessCode, { shouldDirty: false });
				setValue("visibility", next.visibility ?? "private", { shouldDirty: false });
				setData((prev) => (prev ? { ...prev, accessCode: next.accessCode, visibility: next.visibility } : prev));
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setRotating(false);
		}
	};

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
						visibility: d.visibility ?? "public",
						accessCode: d.accessCode ?? "",
						status: d.status ?? "active",
						acl: ACL_KEYS.reduce((acc, k) => {
							const v = d.acl?.[k];
							const resolved = v === undefined || v === null ? CAPABILITIES[k].default : v;
							return writeAcl(acc, k, resolved);
						}, {}),
						reporting: {
							sales: {
								daily: d.reporting?.sales?.daily ?? 0,
								weekly: d.reporting?.sales?.weekly ?? 0,
								monthly: d.reporting?.sales?.monthly ?? 0,
							},
							churn: {
								daily: d.reporting?.churn?.daily ?? 0,
								weekly: d.reporting?.churn?.weekly ?? 0,
								monthly: d.reporting?.churn?.monthly ?? 0,
							},
							cron: {
								daily: d.reporting?.cron?.daily ?? "",
								weekly: d.reporting?.cron?.weekly ?? "",
								monthly: d.reporting?.cron?.monthly ?? "",
							},
						},
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
			const acl = ACL_KEYS.reduce((acc, k) => {
				const spec = CAPABILITIES[k];
				const v = readAcl(formData.acl, k);
				if (spec.type === "bool") acc[k] = Boolean(v);
				else acc[k] = Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0;
				return acc;
			}, {});
			const reporting = {
				sales: REPORTING_FREQS.reduce((acc, f) => {
					acc[f] = Math.max(0, Number(formData.reporting?.sales?.[f]) || 0);
					return acc;
				}, {}),
				churn: REPORTING_FREQS.reduce((acc, f) => {
					acc[f] = Math.max(0, Number(formData.reporting?.churn?.[f]) || 0);
					return acc;
				}, {}),
				// Cron overrides not editable in UI; preserve existing values from API.
				cron: data?.reporting?.cron ?? { daily: null, weekly: null, monthly: null },
			};
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
				visibility: formData.visibility === "private" ? "private" : "public",
				status: formData.status || "active",
				acl,
				reporting,
			};
			if (payload.visibility === "private" && formData.accessCode?.trim()) {
				payload.accessCode = formData.accessCode.trim();
			}
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
		setDeleteConfirmOpen(false);
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
						className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
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
					className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form onSubmit={handleSubmit(onSave)} className="flex flex-1 flex-col overflow-hidden">
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-6">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
								{error}
							</div>
						)}

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={`${strings("form.tier.name")} *`}
								{...register("name", { required: strings("error.required") })}
								error={errors.name?.message}
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

						<div className="grid grid-cols-2 gap-4">
							<Select
								label={strings("form.tier.status")}
								{...register("status")}
								options={STATUS_OPTIONS}
							/>
							<Select
								label={strings("form.tier.visibility")}
								{...register("visibility")}
								options={VISIBILITY_OPTIONS}
							/>
						</div>

						{visibility === "private" && (
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
								<label
									htmlFor="tier-access-code"
									className="block text-xs font-medium uppercase tracking-wide text-slate-500"
								>
									{strings("form.tier.accessCode")}
								</label>
								<div className="flex items-center gap-2">
									<input
										id="tier-access-code"
										type="text"
										{...register("accessCode")}
										placeholder={isNew ? strings("form.tier.accessCodeAutoGen") : ""}
										className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900"
									/>
									{accessCode && (
										<button
											type="button"
											onClick={onCopyAccessCode}
											className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
											title={strings("form.tier.accessCodeCopy")}
										>
											<i
												className={`fa-solid ${accessCodeCopied ? "fa-check text-emerald-600" : "fa-copy"}`}
												aria-hidden
											/>
										</button>
									)}
									{!isNew && (
										<button
											type="button"
											onClick={onRotateAccessCode}
											disabled={rotating}
											className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
											title={strings("form.tier.accessCodeRotate")}
										>
											<i
												className={`fa-solid ${rotating ? "fa-spinner fa-spin" : "fa-arrows-rotate"}`}
												aria-hidden
											/>
										</button>
									)}
								</div>
								<p className="text-xs text-slate-500">
									{strings("form.tier.accessCodeHint")}
								</p>
							</div>
						)}

						<hr className="border-slate-200" />

						<div className="rounded-lg border border-slate-200 p-4">
							<div className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
								<span className="flex items-center gap-2">
									<i className="fa-solid fa-key text-slate-500" aria-hidden />
									{strings("form.tier.capabilities")}
								</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => setAllAcl("enable")}
										className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
									>
										{strings("form.tier.aclEnableAll")}
									</button>
									<button
										type="button"
										onClick={() => setAllAcl("disable")}
										className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
									>
										{strings("form.tier.aclDisableAll")}
									</button>
									<button
										type="button"
										onClick={() => setAllAcl("default")}
										className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
									>
										{strings("form.tier.aclResetDefaults")}
									</button>
								</div>
							</div>
							<p className="mb-3 text-xs text-slate-500">
								{strings("form.tier.capabilitiesHint")}
							</p>
							<div className="space-y-2">
								{ACL_KEYS.map((key) => {
									const spec = CAPABILITIES[key];
									const value = readAcl(aclValues, key);
									const isReporting =
										key === "reporting.sales" || key === "reporting.churn";
									const reportingType = isReporting ? key.split(".")[1] : null;
									const reportingEnabled = isReporting && !!value;
									return (
										<div
											key={key}
											className="rounded-md border border-slate-100 px-3 py-2"
										>
											<div className="flex items-center gap-3">
												<span className="flex-1 text-sm text-slate-700">
													<span className="font-medium">{spec.label}</span>
													<span className="ml-2 text-xs text-slate-400">{key}</span>
												</span>
												{spec.type === "bool" ? (
													<input
														type="checkbox"
														{...register(`acl.${key}`)}
														className="h-4 w-4 rounded border-slate-300"
													/>
												) : (
													<>
														<input
															type="number"
															min="0"
															{...register(`acl.${key}`, { valueAsNumber: true })}
															className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
														/>
														<button
															type="button"
															onClick={() => setValue(aclPath(key), UNLIMITED, { shouldDirty: true })}
															className={`rounded-md border px-2 py-1 text-xs font-medium ${
																value === UNLIMITED
																	? "border-emerald-300 bg-emerald-50 text-emerald-700"
																	: "border-slate-300 text-slate-600 hover:bg-slate-50"
															}`}
														>
															Unlimited
														</button>
													</>
												)}
											</div>
											{reportingEnabled && (
												<div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
													{REPORTING_FREQS.map((f) => (
														<div key={f}>
															<label className="block text-xs text-slate-500">
																{strings(`form.tier.reporting.${f}`)}
															</label>
															<input
																type="number"
																step="0.01"
																min="0"
																{...register(`reporting.${reportingType}.${f}`, { valueAsNumber: true })}
																className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
															/>
														</div>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
					<div>
						{!isNew && (
							<button
								type="button"
								onClick={() => setDeleteConfirmOpen(true)}
								disabled={saving || deleting}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
				title={strings("confirm.deleteTier")}
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
					{strings("confirm.deleteTierBody", [data?.name ?? ""])}
				</p>
			</Modal>
		</div>
	);
};

export default TierPanel;
