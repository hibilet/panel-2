import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Input, Select } from "../../../../components/inputs";
import SellerBlock from "../../../../components/invoices/SellerBlock";
import { Modal } from "../../../../components/shared";
import { FAMILIES } from "../../../../lib/capabilities";
import { del, get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const SERVICE_OPTIONS = [
	{ value: "dashboard", label: "dashboard" },
	{ value: "widget", label: "widget" },
	{ value: "api", label: "api" },
];

const emptySeller = {
	legalName: "",
	tradeName: "",
	vatId: "",
	registry: "",
	iban: "",
	email: "",
	phone: "",
	address: { country: "", city: "", zip: "", street: "" },
	country: "",
	defaultRate: "",
	taxProfile: "",
	invoiceNumberPrefix: "",
	invoiceFooter: "",
};

const defaultFeatures = FAMILIES.reduce((acc, f) => {
	acc[f] = true;
	return acc;
}, {});

const defaultValues = {
	name: "",
	domains: [{ hostname: "", service: "dashboard" }],
	urls: { dashboard: "", widget: "" },
	branding: { logo: "", primaryColor: "" },
	smtp: { host: "", port: "", user: "", pass: "", from: "" },
	stripe: {
		connectClientId: "",
		connectSecret: "",
		connectWebhookSecret: "",
		transactionWebhookSecret: "",
	},
	features: defaultFeatures,
	seller: emptySeller,
};

const RealmPanel = ({ id, onClose, onSaved, onDeleted }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [smtpOpen, setSmtpOpen] = useState(false);
	const [stripeOpen, setStripeOpen] = useState(false);
	const [error, setError] = useState(null);

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm({ defaultValues });

	const { fields, append, remove } = useFieldArray({
		control,
		name: "domains",
	});

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setData(null);
			reset(defaultValues);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/realms/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						domains:
							Array.isArray(d.domains) && d.domains.length > 0
								? d.domains.map((dom) => ({
										hostname: dom.hostname ?? "",
										service: dom.service ?? "dashboard",
									}))
								: [{ hostname: "", service: "dashboard" }],
						urls: {
							dashboard: d.urls?.dashboard ?? "",
							widget: d.urls?.widget ?? "",
						},
						branding: {
							logo: d.branding?.logo ?? "",
							primaryColor: d.branding?.primaryColor ?? "",
						},
						smtp: {
							host: d.smtp?.host ?? "",
							port: d.smtp?.port ?? "",
							user: d.smtp?.user ?? "",
							pass: d.smtp?.pass ?? "",
							from: d.smtp?.from ?? "",
						},
						stripe: {
							connectClientId: d.stripe?.connectClientId ?? "",
							connectSecret: d.stripe?.connectSecret ?? "",
							connectWebhookSecret: d.stripe?.connectWebhookSecret ?? "",
							transactionWebhookSecret: d.stripe?.transactionWebhookSecret ?? "",
						},
						features: FAMILIES.reduce((acc, f) => {
							acc[f] = d.features?.[f] !== false;
							return acc;
						}, {}),
						seller: {
							legalName: d.seller?.legalName ?? "",
							tradeName: d.seller?.tradeName ?? "",
							vatId: d.seller?.vatId ?? "",
							registry: d.seller?.registry ?? "",
							iban: d.seller?.iban ?? "",
							email: d.seller?.email ?? "",
							phone: d.seller?.phone ?? "",
							address: {
								country: d.seller?.address?.country ?? "",
								city: d.seller?.address?.city ?? "",
								zip: d.seller?.address?.zip ?? "",
								street: d.seller?.address?.street ?? "",
							},
							country: d.seller?.country ?? "",
							defaultRate:
								d.seller?.defaultRate != null
									? String(d.seller.defaultRate)
									: "",
							taxProfile: d.seller?.taxProfile ?? "",
							invoiceNumberPrefix: d.seller?.invoiceNumberPrefix ?? "",
							invoiceFooter: d.seller?.invoiceFooter ?? "",
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
			const cleanDomains = (formData.domains ?? [])
				.filter((d) => d.hostname?.trim())
				.map((d) => ({
					hostname: d.hostname.trim(),
					service: d.service || "dashboard",
				}));
			const s = formData.seller ?? {};
			const sAddr = s.address ?? {};
			const sellerHasContent = Object.entries(s).some(([key, value]) => {
				if (key === "address") {
					return Object.values(value ?? {}).some((v) => String(v ?? "").trim());
				}
				return String(value ?? "").trim();
			});
			const sellerPayload = sellerHasContent
				? {
						legalName: s.legalName?.trim() || undefined,
						tradeName: s.tradeName?.trim() || undefined,
						vatId: s.vatId?.trim() || undefined,
						registry: s.registry?.trim() || undefined,
						iban: s.iban?.trim() || undefined,
						email: s.email?.trim() || undefined,
						phone: s.phone?.trim() || undefined,
						address: {
							country: sAddr.country?.trim() || undefined,
							city: sAddr.city?.trim() || undefined,
							zip: sAddr.zip?.trim() || undefined,
							street: sAddr.street?.trim() || undefined,
						},
						country: s.country?.trim() || undefined,
						defaultRate:
							s.defaultRate !== "" && s.defaultRate != null
								? Number(s.defaultRate)
								: undefined,
						taxProfile: s.taxProfile?.trim() || undefined,
						invoiceNumberPrefix: s.invoiceNumberPrefix?.trim() || undefined,
						invoiceFooter: s.invoiceFooter?.trim() || undefined,
					}
				: undefined;
			const payload = {
				name: formData.name?.trim() || undefined,
				domains: cleanDomains,
				urls: {
					dashboard: formData.urls?.dashboard?.trim() || undefined,
					widget: formData.urls?.widget?.trim() || undefined,
				},
				branding: {
					logo: formData.branding?.logo?.trim() || undefined,
					primaryColor: formData.branding?.primaryColor?.trim() || undefined,
				},
				smtp: {
					host: formData.smtp?.host?.trim() || undefined,
					port: formData.smtp?.port ? Number(formData.smtp.port) : undefined,
					user: formData.smtp?.user?.trim() || undefined,
					pass: formData.smtp?.pass || undefined,
					from: formData.smtp?.from?.trim() || undefined,
				},
				stripe: {
					connectClientId:
						formData.stripe?.connectClientId?.trim() || undefined,
					connectSecret: formData.stripe?.connectSecret?.trim() || undefined,
					connectWebhookSecret:
						formData.stripe?.connectWebhookSecret?.trim() || undefined,
					transactionWebhookSecret:
						formData.stripe?.transactionWebhookSecret?.trim() || undefined,
				},
				features: FAMILIES.reduce((acc, f) => {
					acc[f] = Boolean(formData.features?.[f]);
					return acc;
				}, {}),
				seller: sellerPayload,
			};
			if (isNew) {
				const res = await post("/realms", payload);
				setData(res.data ?? null);
				onSaved?.();
			} else {
				const res = await put(`/realms/${id}`, payload);
				setData((prev) =>
					prev ? { ...prev, ...(res.data ?? payload) } : res.data,
				);
				onSaved?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async () => {
		if (isNew || !id) return;
		setDeleteConfirmOpen(false);
		setDeleting(true);
		setError(null);
		try {
			await del(`/realms/${id}`);
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
							? strings("form.realm.newTitle")
							: strings("form.realm.editTitle")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
						? strings("form.realm.newTitle")
						: (data?.name ?? strings("form.realm.editTitle"))}
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
							<div
								className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
								role="alert"
							>
								{error}
							</div>
						)}

						<Input
							label={`${strings("form.realm.name")} *`}
							{...register("name", { required: strings("error.required") })}
							error={errors.name?.message}
							placeholder={strings("form.realm.namePlaceholder")}
						/>

						<div>
							<div className="mb-2 flex items-center justify-between">
								<span className="text-sm font-medium text-slate-700">
									{strings("form.realm.domains")}
								</span>
								<button
									type="button"
									onClick={() => append({ hostname: "", service: "dashboard" })}
									className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
								>
									<i className="fa-solid fa-plus" aria-hidden />
									{strings("form.realm.addDomain")}
								</button>
							</div>
							<div className="space-y-2">
								{fields.map((field, index) => (
									<div key={field.id} className="flex items-start gap-2">
										<div className="flex-1">
											<Input
												{...register(`domains.${index}.hostname`)}
												placeholder={strings("form.realm.hostnamePlaceholder")}
											/>
										</div>
										<div className="w-40">
											<Select
												{...register(`domains.${index}.service`)}
												options={SERVICE_OPTIONS}
											/>
										</div>
										<button
											type="button"
											onClick={() => remove(index)}
											className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
											aria-label={strings("common.delete")}
										>
											<i className="fa-solid fa-trash" aria-hidden />
										</button>
									</div>
								))}
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<Input
								label={strings("form.realm.dashboardUrl")}
								{...register("urls.dashboard")}
								placeholder="https://panel.example.com"
							/>
							<Input
								label={strings("form.realm.widgetUrl")}
								{...register("urls.widget")}
								placeholder="https://app.example.com"
							/>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Input
								label={strings("form.realm.brandingLogo")}
								{...register("branding.logo")}
								placeholder="https://..."
							/>
							<Input
								label={strings("form.realm.brandingColor")}
								{...register("branding.primaryColor")}
								placeholder="#1e293b"
							/>
						</div>

						<div className="rounded-lg border border-slate-200">
							<button
								type="button"
								onClick={() => setSmtpOpen((v) => !v)}
								className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								<span className="inline-flex items-center gap-2">
									<i
										className="fa-solid fa-envelope text-slate-500"
										aria-hidden
									/>
									{strings("form.realm.smtp")}
								</span>
								<i
									className={`fa-solid ${smtpOpen ? "fa-chevron-up" : "fa-chevron-down"}`}
									aria-hidden
								/>
							</button>
							{smtpOpen && (
								<div className="space-y-4 border-t border-slate-200 px-4 py-4">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<Input
											label={strings("form.realm.smtpHost")}
											{...register("smtp.host")}
										/>
										<Input
											label={strings("form.realm.smtpPort")}
											type="number"
											{...register("smtp.port")}
										/>
										<Input
											label={strings("form.realm.smtpUser")}
											{...register("smtp.user")}
											autoComplete="off"
										/>
										<Input
											label={strings("form.realm.smtpPass")}
											type="password"
											{...register("smtp.pass")}
											autoComplete="off"
										/>
										<Input
											label={strings("form.realm.smtpFrom")}
											{...register("smtp.from")}
											placeholder="no-reply@example.com"
										/>
									</div>
								</div>
							)}
						</div>

						<div className="rounded-lg border border-slate-200">
							<button
								type="button"
								onClick={() => setStripeOpen((v) => !v)}
								className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								<span className="inline-flex items-center gap-2">
									<i
										className="fa-brands fa-stripe-s text-slate-500"
										aria-hidden
									/>
									Stripe Connect (whitelabel)
								</span>
								<i
									className={`fa-solid ${stripeOpen ? "fa-chevron-up" : "fa-chevron-down"}`}
									aria-hidden
								/>
							</button>
							{stripeOpen && (
								<div className="space-y-4 border-t border-slate-200 px-4 py-4">
									<p className="text-xs text-slate-500">
										Optional. When set, this realm runs its merchant Connect
										flow against its own Stripe platform. Empty fields fall
										back to the default platform credentials.
									</p>
									<div className="grid grid-cols-1 gap-4">
										<Input
											label="Connect Client ID"
											{...register("stripe.connectClientId")}
											placeholder="ca_..."
											autoComplete="off"
										/>
										<Input
											label="Platform Secret Key"
											type="password"
											{...register("stripe.connectSecret")}
											placeholder="sk_live_..."
											autoComplete="off"
										/>
										<Input
											label="Connect Webhook Signing Secret"
											type="password"
											{...register("stripe.connectWebhookSecret")}
											placeholder="whsec_..."
											autoComplete="off"
										/>
										<Input
											label="Transaction Webhook Signing Secret"
											type="password"
											{...register("stripe.transactionWebhookSecret")}
											placeholder="whsec_..."
											autoComplete="off"
										/>
									</div>
								</div>
							)}
						</div>

						<div className="rounded-lg border border-slate-200 p-4">
							<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
								<i className="fa-solid fa-toggle-on text-slate-500" aria-hidden />
								Realm features
							</div>
							<p className="mb-3 text-xs text-slate-500">
								Realm-wide hard ceiling. Disabling a family hides every related
								capability for every account on this realm regardless of tier or
								account override.
							</p>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{FAMILIES.map((f) => (
									<label
										key={f}
										className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
									>
										<input
											type="checkbox"
											{...register(`features.${f}`)}
											className="h-4 w-4 rounded border-slate-300"
										/>
										<span className="capitalize">{f}</span>
									</label>
								))}
							</div>
						</div>

						<SellerBlock
						register={register}
						errors={errors}
						needsSetup={
							!isNew &&
							data &&
							(!data.seller?.country || data.seller?.defaultRate == null)
						}
					/>
					</div>
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
					<div>
						{!isNew && (
							<button
								type="button"
								onClick={() => setDeleteConfirmOpen(true)}
								disabled={saving || deleting}
								className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
							>
								<i className="fa-solid fa-trash" aria-hidden />
								{strings("common.delete")}
							</button>
						)}
					</div>
					<button
						type="submit"
						disabled={saving || deleting}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
				title={strings("confirm.deleteRealm")}
				footer={
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={() => setDeleteConfirmOpen(false)}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						>
							{strings("common.cancel")}
						</button>
						<button
							type="button"
							onClick={onDelete}
							className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
						>
							{strings("common.delete")}
						</button>
					</div>
				}
			>
				<p className="text-sm text-slate-600">
					{strings("confirm.deleteRealmBody", [data?.name ?? ""])}
				</p>
			</Modal>
		</div>
	);
};

export default RealmPanel;
