import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { Input, Select } from "../../../../components/inputs";
import SellerBlock from "../../../../components/invoices/SellerBlock";
import { useApp } from "../../../../context";
import { put } from "../../../../lib/client";
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
	seller: emptySeller,
};

const SettingsRealm = () => {
	const { account, realm, refreshRealm } = useApp();
	const [, setLocation] = useLocation();
	const [saving, setSaving] = useState(false);
	const [smtpOpen, setSmtpOpen] = useState(false);
	const [stripeOpen, setStripeOpen] = useState(false);
	const [error, setError] = useState(null);

	const isAdmin = account?.type === "account.admin";
	const realmId = realm?._id ?? realm?.id ?? null;

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
		if (!realm) return;
		reset({
			name: realm.name ?? "",
			domains:
				Array.isArray(realm.domains) && realm.domains.length > 0
					? realm.domains.map((d) => ({
							hostname: d.hostname ?? "",
							service: d.service ?? "dashboard",
						}))
					: [{ hostname: "", service: "dashboard" }],
			urls: {
				dashboard: realm.urls?.dashboard ?? "",
				widget: realm.urls?.widget ?? "",
			},
			branding: {
				logo: realm.branding?.logo ?? "",
				primaryColor: realm.branding?.primaryColor ?? "",
			},
			smtp: {
				host: realm.smtp?.host ?? "",
				port: realm.smtp?.port ?? "",
				user: realm.smtp?.user ?? "",
				pass: realm.smtp?.pass ?? "",
				from: realm.smtp?.from ?? "",
			},
			stripe: {
				connectClientId: realm.stripe?.connectClientId ?? "",
				connectSecret: realm.stripe?.connectSecret ?? "",
				connectWebhookSecret: realm.stripe?.connectWebhookSecret ?? "",
				transactionWebhookSecret:
					realm.stripe?.transactionWebhookSecret ?? "",
			},
			seller: {
				legalName: realm.seller?.legalName ?? "",
				tradeName: realm.seller?.tradeName ?? "",
				vatId: realm.seller?.vatId ?? "",
				registry: realm.seller?.registry ?? "",
				iban: realm.seller?.iban ?? "",
				email: realm.seller?.email ?? "",
				phone: realm.seller?.phone ?? "",
				address: {
					country: realm.seller?.address?.country ?? "",
					city: realm.seller?.address?.city ?? "",
					zip: realm.seller?.address?.zip ?? "",
					street: realm.seller?.address?.street ?? "",
				},
				country: realm.seller?.country ?? "",
				defaultRate:
					realm.seller?.defaultRate != null
						? String(realm.seller.defaultRate)
						: "",
				taxProfile: realm.seller?.taxProfile ?? "",
				invoiceNumberPrefix: realm.seller?.invoiceNumberPrefix ?? "",
				invoiceFooter: realm.seller?.invoiceFooter ?? "",
			},
		});
	}, [realm, reset]);

	const onSave = async (formData) => {
		if (!realmId) return;
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
				seller: sellerPayload,
			};
			await put(`/realms/${realmId}`, payload);
			await refreshRealm();
			setLocation("/settings");
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	if (!isAdmin) {
		return (
			<div className="mx-auto max-w-3xl">
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
					{strings("page.settings.realmAdminOnly")}
				</div>
			</div>
		);
	}

	const sellerNeedsSetup =
		!!realm && (!realm.seller?.country || realm.seller?.defaultRate == null);

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900">
					<i className="fa-solid fa-globe text-slate-600" aria-hidden />
					{strings("page.settings.realmTitle")}
				</h1>

				{!realm ? (
					<div className="flex items-center justify-center py-12">
						<i
							className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
							aria-hidden
						/>
					</div>
				) : (
					<form onSubmit={handleSubmit(onSave)} className="space-y-6">
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
							{...register("name", {
								required: strings("error.required"),
							})}
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

						<SellerBlock
							register={register}
							errors={errors}
							needsSetup={sellerNeedsSetup}
						/>

						<div className="pt-2">
							<button
								type="submit"
								disabled={saving}
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
						</div>
					</form>
				)}
			</div>
		</div>
	);
};

export default SettingsRealm;
