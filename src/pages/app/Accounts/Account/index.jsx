import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormSection, Input, Select } from "../../../../components/inputs";
import { get, post, put } from "../../../../lib/client";
import { getToken, setHotSwapToken, setToken } from "../../../../lib/storage";
import strings from "../../../../localization";

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const COMMISSION_TYPE_OPTIONS = [
	{
		value: "percentage",
		label: strings("form.account.commissionTypePercentage"),
	},
	{ value: "fixed", label: strings("form.account.commissionTypeFixed") },
];

const defaultValues = {
	name: "",
	email: "",
	phone: "",
	status: "active",
	commissionAmount: 1.0, // stored as decimal (0.4 = 40%)
	commissionVat: 1.19, // stored as multiplier (1.19 = 19%)
	commissionType: "fixed",
};

const AccountPanel = ({ id, accountType, onClose, onSaved }) => {
	const isMerchant = accountType === "account.merchant";
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [loginAsLoading, setLoginAsLoading] = useState(false);
	const [setInactiveLoading, setSetInactiveLoading] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, control, watch, getValues } = useForm({
		defaultValues,
	});
	const commissionType = watch("commissionType");

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setData(null);
			reset(defaultValues);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/accounts/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					const commission = d.commission ?? {};
					reset({
						name: d.name ?? "",
						email: d.email ?? "",
						phone: d.phone ?? "",
						status: d.status ?? "active",
						commissionAmount: commission.amount ?? 0.4,
						commissionVat: commission.vat ?? 1.19,
						commissionType: commission.type ?? "percentage",
					});
				}
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadAccounts")),
			)
			.finally(() => setLoading(false));
	}, [id, isNew, reset]);

	const onSave = async (formData) => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: formData.name?.trim() || undefined,
				email: formData.email?.trim() || undefined,
				phone: formData.phone?.trim() || undefined,
				status: formData.status || undefined,
			};
			if (isMerchant) {
				const commissionAmount = Number(formData.commissionAmount);
				payload.commission = {
					...(data?.commission ?? {}),
					amount: !Number.isNaN(commissionAmount) ? commissionAmount : 0.4,
					vat: Number(formData.commissionVat) || 1.19,
					type: formData.commissionType || "percentage",
				};
			}
			payload.type = accountType ?? data?.type ?? "account.merchant";
			if (isNew) {
				const res = await post("/accounts", payload);
				const created = res.data ?? null;
				const newId = created?.id ?? created?._id;
				if (newId) onSaved?.(newId);
			} else {
				const res = await put(`/accounts/${id}`, payload);
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

	const handleSetInactive = async () => {
		if (isNew || !id) return;
		if (!window.confirm(strings("form.account.confirmSetInactive"))) return;
		setSetInactiveLoading(true);
		setError(null);
		try {
			const res = await put(`/accounts/${id}`, { status: "inactive" });
			setData((prev) =>
				prev ? { ...prev, ...(res.data ?? { status: "inactive" }) } : null,
			);
			reset({ ...getValues(), status: "inactive" });
			onSaved?.();
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSetInactiveLoading(false);
		}
	};

	const handleLoginAs = async () => {
		if (!data?.type) {
			setError(strings("form.account.errorLoginAs"));
			return;
		}
		setLoginAsLoading(true);
		setError(null);
		try {
			const res = await post("/auth/token", { id, type: data.type });
			const token = res?.data?.token ?? res?.token;
			if (token) {
				const currentToken = getToken();
				if (currentToken) setHotSwapToken(currentToken);
				setToken(token);
			} else {
				setError(strings("form.account.errorLoginAs"));
			}
		} catch (err) {
			setError(err?.message ?? strings("form.account.errorLoginAs"));
		} finally {
			setLoginAsLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{strings("page.accounts.details")}
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
				) : !isNew && error && !data ? (
					<div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
						{error}
					</div>
				) : (
					<form
						id="account-form"
						onSubmit={handleSubmit(onSave)}
						className="space-y-4"
					>
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
								{error}
							</div>
						)}
						<Input
							label={strings("common.name")}
							{...register("name")}
							placeholder={strings("page.settings.yourName")}
						/>
						<Input
							label={strings("page.accounts.email")}
							type="email"
							{...register("email")}
							placeholder={strings("page.settings.emailPlaceholder")}
						/>
						<Input
							label={strings("page.settings.phone")}
							{...register("phone")}
							placeholder="+90 555 555 5555"
						/>
						<Select
							label={strings("common.status")}
							{...register("status")}
							options={STATUS_OPTIONS}
						/>
						{isMerchant && (
							<FormSection title={strings("form.account.commission")}>
								<Select
									label={strings("form.account.commissionType")}
									{...register("commissionType")}
									options={COMMISSION_TYPE_OPTIONS}
								/>
								{commissionType === "percentage" ? (
									<Controller
										control={control}
										name="commissionAmount"
										render={({ field }) => (
											<Input
												label={strings("form.account.commissionAmount")}
												type="number"
												step="0.01"
												min="0"
												max="100"
												placeholder="40"
												endAdornment="%"
												value={
													field.value != null &&
													field.value !== "" &&
													!Number.isNaN(Number(field.value))
														? String(
																Math.round(Number(field.value) * 10000) / 100,
															)
														: ""
												}
												onChange={(e) => {
													const v = e.target.value;
													const num = v === "" ? 0 : Number(v) / 100;
													field.onChange(num);
												}}
												onBlur={field.onBlur}
												name={field.name}
												ref={field.ref}
											/>
										)}
									/>
								) : (
									<Input
										label={strings("form.account.commissionAmount")}
										type="number"
										step="0.01"
										min="0"
										{...register("commissionAmount", { valueAsNumber: true })}
										placeholder="10.50"
										endAdornment="€"
									/>
								)}
								<Controller
									control={control}
									name="commissionVat"
									render={({ field }) => (
										<Input
											label={strings("form.account.commissionVat")}
											type="number"
											step="0.01"
											min="0"
											max="100"
											placeholder="19"
											endAdornment="%"
											value={
												field.value != null &&
												field.value !== "" &&
												!Number.isNaN(Number(field.value))
													? String(
															Math.round((Number(field.value) - 1) * 10000) /
																100,
														)
													: ""
											}
											onChange={(e) => {
												const v = e.target.value;
												const num = v === "" ? 1 : 1 + Number(v) / 100;
												field.onChange(num);
											}}
											onBlur={field.onBlur}
											name={field.name}
											ref={field.ref}
										/>
									)}
								/>
							</FormSection>
						)}
					</form>
				)}
			</div>

			{!loading && (data || isNew) && (
				<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
					{!isNew && (
						<>
							{data?.status === "active" && (
								<button
									type="button"
									onClick={handleSetInactive}
									disabled={setInactiveLoading}
									className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
								>
									{setInactiveLoading ? (
										<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									) : (
										<i className="fa-solid fa-trash-can" aria-hidden />
									)}
									{strings("form.account.setInactive")}
								</button>
							)}
							<button
								type="button"
								onClick={handleLoginAs}
								disabled={loginAsLoading}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
							>
								{loginAsLoading ? (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								) : (
									<i className="fa-solid fa-right-to-bracket" aria-hidden />
								)}
								{strings("form.account.loginAs")}
							</button>
						</>
					)}
					<button
						type="submit"
						form="account-form"
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

export default AccountPanel;
