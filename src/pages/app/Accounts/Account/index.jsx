import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormSection, Input, Select } from "../../../../components/inputs";
import { Modal } from "../../../../components/shared";
import { CAPABILITIES, UNLIMITED } from "../../../../lib/capabilities";
import { get, patch, post, put } from "../../../../lib/client";
import { getToken, setHotSwapToken, setToken } from "../../../../lib/storage";
import strings, { formatCurrency } from "../../../../localization";
import { useApp } from "../../../../context";

const STATUS_OPTIONS = [
	{ value: "active", label: strings("common.active") },
	{ value: "inactive", label: strings("common.inactive") },
];

const ACL_KEYS = Object.keys(CAPABILITIES);

const AclOverrideEditor = ({ accountId, initialAcl, onSaved }) => {
	const [overrides, setOverrides] = useState(initialAcl ?? {});
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		setOverrides(initialAcl ?? {});
	}, [initialAcl]);

	const setOverride = (key, value) => {
		setOverrides((prev) => {
			const next = { ...prev };
			if (value === undefined) delete next[key];
			else next[key] = value;
			return next;
		});
	};

	const isOverridden = (key) => Object.prototype.hasOwnProperty.call(overrides, key);

	const onSave = async () => {
		setSaving(true);
		setMsg(null);
		setError(null);
		try {
			const patchBody = {};
			for (const key of ACL_KEYS) {
				if (isOverridden(key)) patchBody[key] = overrides[key];
				else patchBody[key] = null;
			}
			const res = await patch(`/accounts/${accountId}/acl`, patchBody);
			setMsg("Saved.");
			onSaved?.(res?.data ?? null);
		} catch (e) {
			setError(e?.message ?? "Save failed");
		} finally {
			setSaving(false);
		}
	};

	return (
		<FormSection title="ACL override (admin)" gridClassName="space-y-3">
			<p className="text-xs text-slate-500">
				Per-account override beats the tier value. Realm family disables still
				win. Choose Inherit to fall back to the tier default.
			</p>
			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
			)}
			{msg && (
				<div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{msg}</div>
			)}
			<div className="space-y-2">
				{ACL_KEYS.map((key) => {
					const spec = CAPABILITIES[key];
					const current = overrides[key];
					const overridden = isOverridden(key);
					return (
						<div
							key={key}
							className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 px-3 py-2"
						>
							<span className="flex-1 text-sm text-slate-700">
								<span className="font-medium">{spec.label}</span>
								<span className="ml-2 text-xs text-slate-400">{key}</span>
							</span>
							{spec.type === "bool" ? (
								<div className="flex gap-1 text-xs">
									<button
										type="button"
										onClick={() => setOverride(key, undefined)}
										className={`rounded-md border px-2 py-1 ${!overridden ? "border-slate-400 bg-slate-100 text-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
									>
										Inherit
									</button>
									<button
										type="button"
										onClick={() => setOverride(key, true)}
										className={`rounded-md border px-2 py-1 ${overridden && current === true ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
									>
										On
									</button>
									<button
										type="button"
										onClick={() => setOverride(key, false)}
										className={`rounded-md border px-2 py-1 ${overridden && current === false ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
									>
										Off
									</button>
								</div>
							) : (
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setOverride(key, undefined)}
										className={`rounded-md border px-2 py-1 text-xs ${!overridden ? "border-slate-400 bg-slate-100 text-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
									>
										Inherit
									</button>
									<input
										type="number"
										min="0"
										value={overridden ? Number(current) : ""}
										placeholder="—"
										onChange={(e) => {
											const v = e.target.value;
											setOverride(key, v === "" ? undefined : Math.max(0, Math.floor(Number(v))));
										}}
										className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
									/>
									<button
										type="button"
										onClick={() => setOverride(key, UNLIMITED)}
										className={`rounded-md border px-2 py-1 text-xs ${overridden && current === UNLIMITED ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
									>
										Unlimited
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
			<div className="flex justify-end">
				<button
					type="button"
					onClick={onSave}
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
				>
					{saving ? (
						<><i className="fa-solid fa-spinner fa-spin" aria-hidden />Saving</>
					) : (
						<><i className="fa-solid fa-floppy-disk" aria-hidden />Save ACL</>
					)}
				</button>
			</div>
		</FormSection>
	);
};

const defaultValues = {
	name: "",
	email: "",
	phone: "",
	status: "active",
};

const AccountPanel = ({ id, accountType, onClose, onSaved }) => {
	const { account: currentUser } = useApp();
	const isAdmin = currentUser?.type === "account.admin";
	const isMerchant = accountType === "account.merchant";
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [loginAsLoading, setLoginAsLoading] = useState(false);
	const [setInactiveLoading, setSetInactiveLoading] = useState(false);
	const [inactiveConfirmOpen, setInactiveConfirmOpen] = useState(false);
	const [error, setError] = useState(null);
	const [tiers, setTiers] = useState([]);
	const [selectedTierUuid, setSelectedTierUuid] = useState("");
	const [changingTier, setChangingTier] = useState(false);
	const [tierChangeMsg, setTierChangeMsg] = useState(null);

	const { register, handleSubmit, reset, getValues } = useForm({
		defaultValues,
	});

	useEffect(() => {
		if (isMerchant && !isNew) {
			get("/tiers")
				.then((res) => setTiers(res.data ?? []))
				.catch(() => {});
		}
	}, [isMerchant, isNew]);

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
					reset({
						name: d.name ?? "",
						email: d.email ?? "",
						phone: d.phone ?? "",
						status: d.status ?? "active",
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
		setInactiveConfirmOpen(false);
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

	const handleChangeTier = async () => {
		if (!selectedTierUuid) return;
		setChangingTier(true);
		setTierChangeMsg(null);
		setError(null);
		try {
			const res = await post("/tiers/admin/change-merchant-tier", { merchantId: id, tierId: selectedTierUuid });
			const msg = res?.message;
			if (msg === "already-subscribed") {
				setTierChangeMsg(strings("form.account.tierAlreadySubscribed"));
			} else if (msg === "tier-changed") {
				setTierChangeMsg(strings("form.account.tierChangedSubscribed"));
			} else if (msg === "tier-assigned") {
				setTierChangeMsg(strings("form.account.tierChangedSubscribed"));
			} else {
				setTierChangeMsg(strings("form.account.tierChangedSubscribed"));
			}
			setSelectedTierUuid("");
			const refreshed = await get(`/accounts/${id}`);
			if (refreshed.data) setData(refreshed.data);
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setChangingTier(false);
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
					className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-100"
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
					<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
						{error}
					</div>
				) : (
					<form
						id="account-form"
						onSubmit={handleSubmit(onSave)}
						className="space-y-4"
					>
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600" role="alert">
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
						{isMerchant && !isNew && (data?.subscription || isAdmin) && (
							<FormSection title={strings("page.subscription.title")} gridClassName="space-y-3">
								{data?.subscription && (
									<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1.5">
										{data.subscription.tier ? (
											<>
												<div className="flex justify-between">
													<span className="text-slate-500">
														{strings("page.subscription.currentTier")}
													</span>
													<span className="font-medium text-slate-900">
														{(typeof data.subscription.tier === "object" ? data.subscription.tier?.name : null)
															?? tiers.find((t) => t.uuid === data.subscription.tierUuid || t.id === data.subscription.tier)?.name
															?? data.subscription.tierUuid
															?? "—"}
													</span>
												</div>
												{(data.subscription.startDate || data.subscription.startedAt) && (
													<div className="flex justify-between">
														<span className="text-slate-500">
															{strings("page.subscription.startedAt", [""])}
														</span>
														<span className="text-slate-700">
															{dayjs(data.subscription.startDate ?? data.subscription.startedAt).format("D MMM YYYY")}
														</span>
													</div>
												)}
												{data.subscription.nextTierUuid && (
													<p className="text-xs text-amber-600">
														{strings("page.subscription.upgradeQueued")}
													</p>
												)}
											</>
										) : (
											<p className="text-slate-500">
												{strings("page.subscription.noTier")}
											</p>
										)}
									</div>
								)}
								{isAdmin && (
									<div className="space-y-2 pt-1">
										<Select
											label={strings("form.account.changeTier")}
											value={selectedTierUuid}
											onChange={(e) => { setSelectedTierUuid(e.target.value); setTierChangeMsg(null); }}
											options={tiers.map((t) => ({
												value: t.uuid,
												label: `${t.name} - ${formatCurrency(t.baseFee)}/mo${(t.perTicketFee ?? 0) > 0 ? ` + ${formatCurrency(t.perTicketFee)}/ticket` : ""}`,
											}))}
											placeholder={strings("form.account.selectTier")}
										/>
										{tierChangeMsg && (
											<p className="text-sm text-emerald-600">{tierChangeMsg}</p>
										)}
										<div className="flex justify-end">
											<button
												type="button"
												onClick={handleChangeTier}
												disabled={!selectedTierUuid || changingTier}
												className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{changingTier ? (
													<><i className="fa-solid fa-spinner fa-spin" aria-hidden />{strings("form.account.changingTier")}</>
												) : (
													<><i className="fa-solid fa-arrows-rotate" aria-hidden />{strings("form.account.changeTier")}</>
												)}
											</button>
										</div>
									</div>
								)}
							</FormSection>
						)}
						{isAdmin && !isNew && data && (
							<AclOverrideEditor
								accountId={id}
								initialAcl={data.acl ?? {}}
								onSaved={(updated) => {
									if (updated) setData((prev) => (prev ? { ...prev, acl: updated.acl ?? {} } : prev));
								}}
							/>
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
									onClick={() => setInactiveConfirmOpen(true)}
									disabled={setInactiveLoading}
									className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
								className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
		<Modal
			isOpen={inactiveConfirmOpen}
			onClose={() => setInactiveConfirmOpen(false)}
			title={strings("form.account.confirmSetInactive")}
			footer={
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={() => setInactiveConfirmOpen(false)}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100"
					>
						{strings("common.cancel")}
					</button>
					<button
						type="button"
						onClick={handleSetInactive}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-700"
					>
						{strings("form.account.setInactive")}
					</button>
				</div>
			}
		>
			<p className="text-sm text-slate-600">
				{strings("form.account.confirmSetInactiveBody", [data?.name ?? ""])}
			</p>
		</Modal>
		</div>
	);
};

export default AccountPanel;
