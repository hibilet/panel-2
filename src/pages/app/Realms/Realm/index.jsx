import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "../../../../components/inputs";
import SellerBlock from "../../../../components/invoices/SellerBlock";
import PlatformBilling from "./PlatformBilling";
import { Modal } from "../../../../components/shared";
import { FAMILIES } from "../../../../lib/capabilities";
import { del, get, post, put } from "../../../../lib/client";
import { DOMAIN_SERVICES, urlsFromDomains } from "../../../../lib/realm";
import ImageUpload from "../../../../components/shared/ImageUpload";
import strings from "../../../../localization";

// One host per service. panel is the dashboard app; old realms stored it under
// the "dashboard" service, so read that as a fallback when loading.
const emptyDomainHosts = DOMAIN_SERVICES.reduce((acc, svc) => {
	acc[svc] = "";
	return acc;
}, {});

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
	domainHosts: emptyDomainHosts,
	branding: { logo: "" },
	enableSmtp: false,
	smtp: { host: "", port: "", user: "", pass: "", from: "" },
	enableStripe: false,
	stripe: {
		connectClientId: "",
		connectSecret: "",
		connectWebhookSecret: "",
		transactionWebhookSecret: "",
	},
	features: defaultFeatures,
	ai: { openrouterKey: "", grokImageKey: "" },
	seller: emptySeller,
};

const RealmPanel = ({ id, onClose, onSaved, onDeleted }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	// The API redacts credentials and returns only <field>Set booleans, so
	// the form can show whether a key is configured without ever holding it.
	const [secretsSet, setSecretsSet] = useState({});
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [error, setError] = useState(null);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm({ defaultValues });

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
					// Map stored domains -> one host per service (panel absorbs a
					// legacy "dashboard" entry).
					const hosts = { ...emptyDomainHosts };
					for (const dom of d.domains ?? []) {
						const svc = dom.service === "dashboard" ? "panel" : dom.service;
						if (svc in hosts && dom.hostname) hosts[svc] = dom.hostname;
					}
					const stripeConfigured = Boolean(
						d.stripe?.connectClientId ||
							d.stripe?.connectSecretSet ||
							d.stripe?.connectWebhookSecretSet ||
							d.stripe?.transactionWebhookSecretSet,
					);
					reset({
						name: d.name ?? "",
						domainHosts: hosts,
						branding: { logo: d.branding?.logo ?? "" },
						enableSmtp: Boolean(d.smtp?.host || d.smtp?.passSet),
						smtp: {
							host: d.smtp?.host ?? "",
							port: d.smtp?.port ?? "",
							user: d.smtp?.user ?? "",
							pass: "",
							from: d.smtp?.from ?? "",
						},
						enableStripe: stripeConfigured,
						stripe: {
							connectClientId: d.stripe?.connectClientId ?? "",
							// Secrets are never sent to the client. Left blank; an
							// untouched field submits undefined and the API keeps
							// whatever is stored.
							connectSecret: "",
							connectWebhookSecret: "",
							transactionWebhookSecret: "",
						},
						features: FAMILIES.reduce((acc, f) => {
							acc[f] = d.features?.[f] !== false;
							return acc;
						}, {}),
						ai: { openrouterKey: "", grokImageKey: "" },
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
					// Which credentials exist server-side. Values are redacted by
					// the API; these booleans only drive the "configured" hint.
					setSecretsSet({
						connectSecret: Boolean(d.stripe?.connectSecretSet),
						connectWebhookSecret: Boolean(d.stripe?.connectWebhookSecretSet),
						transactionWebhookSecret: Boolean(
							d.stripe?.transactionWebhookSecretSet,
						),
						smtpPass: Boolean(d.smtp?.passSet),
						openrouterKey: Boolean(d.ai?.openrouterKeySet),
						grokImageKey: Boolean(d.ai?.grokImageKeySet),
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
			const cleanDomains = DOMAIN_SERVICES.map((svc) => ({
				service: svc,
				hostname: (formData.domainHosts?.[svc] ?? "").trim(),
			})).filter((d) => d.hostname);
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
				// Derived from domains - no separate URL fields to keep in sync.
				urls: urlsFromDomains(cleanDomains),
				branding: {
					logo: formData.branding?.logo?.trim() || undefined,
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
				// AI keys are secrets: only send when the field was filled, so an
				// untouched field keeps whatever is stored.
				ai: {
					openrouterKey: formData.ai?.openrouterKey?.trim() || undefined,
					grokImageKey: formData.ai?.grokImageKey?.trim() || undefined,
				},
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
							<span className="mb-2 block text-sm font-medium text-slate-700">
								{strings("form.realm.domains")}
							</span>
							<div className="space-y-2">
								{DOMAIN_SERVICES.map((svc) => (
									<div key={svc} className="flex items-center gap-2">
										<span className="w-20 shrink-0 text-right text-xs font-medium uppercase text-slate-500">
											{svc}
										</span>
										<div className="flex-1">
											<Input
												{...register(`domainHosts.${svc}`)}
												placeholder={`${svc}.example.com`}
											/>
										</div>
									</div>
								))}
							</div>
							<p className="mt-1 text-xs text-slate-500">
								{strings(
									"form.realm.urlsDerivedHint",
									"Public URLs are derived from these hosts (https, or http for localhost).",
								)}
							</p>
						</div>

						<div>
							<span className="mb-1 block text-sm font-medium text-slate-700">
								{strings("form.realm.brandingLogo")}
							</span>
							<ImageUpload
								variant="dropzone"
								aspectClass="aspect-[4/1] max-h-40"
								value={watch("branding.logo")}
								onChange={(url) =>
									setValue("branding.logo", url, { shouldDirty: true })
								}
								onRemove={() =>
									setValue("branding.logo", "", { shouldDirty: true })
								}
							/>
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
								{/* Config toggles, same box: checking one reveals its fields
								    below (like AI keys). Not capability families. */}
								<label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
									<input
										type="checkbox"
										{...register("enableSmtp")}
										className="h-4 w-4 rounded border-slate-300"
									/>
									<span>SMTP</span>
								</label>
								<label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
									<input
										type="checkbox"
										{...register("enableStripe")}
										className="h-4 w-4 rounded border-slate-300"
									/>
									<span>Stripe</span>
								</label>
							</div>
						</div>

						{/* SMTP fields - shown when the SMTP toggle above is checked */}
						{watch("enableSmtp") && (
							<div className="rounded-lg border border-slate-200 p-4">
								<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
									<i className="fa-solid fa-envelope text-slate-500" aria-hidden />
									{strings("form.realm.smtp")}
								</div>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Input label={strings("form.realm.smtpHost")} {...register("smtp.host")} />
									<Input label={strings("form.realm.smtpPort")} type="number" {...register("smtp.port")} />
									<Input label={strings("form.realm.smtpUser")} {...register("smtp.user")} autoComplete="off" />
									<Input
										label={strings("form.realm.smtpPass")}
										type="password"
										{...register("smtp.pass")}
										placeholder={secretsSet.smtpPass ? "configured - leave blank to keep" : ""}
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

						{/* Stripe fields - shown when the Stripe toggle above is checked */}
						{watch("enableStripe") && (
							<div className="rounded-lg border border-slate-200 p-4">
								<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
									<i className="fa-brands fa-stripe-s text-slate-500" aria-hidden />
									Stripe Connect (whitelabel)
								</div>
								<p className="mb-3 text-xs text-slate-500">
									This realm runs its merchant Connect flow against its own
									Stripe platform. Empty fields fall back to the default
									platform credentials.
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
										placeholder={secretsSet.connectSecret ? "configured - leave blank to keep" : "sk_live_..."}
										autoComplete="off"
									/>
									<Input
										label="Connect Webhook Signing Secret"
										type="password"
										{...register("stripe.connectWebhookSecret")}
										placeholder={secretsSet.connectWebhookSecret ? "configured - leave blank to keep" : "whsec_..."}
										autoComplete="off"
									/>
									<Input
										label="Transaction Webhook Signing Secret"
										type="password"
										{...register("stripe.transactionWebhookSecret")}
										placeholder={secretsSet.transactionWebhookSecret ? "configured - leave blank to keep" : "whsec_..."}
										autoComplete="off"
									/>
								</div>
							</div>
						)}

						{/* AI keys - shown when the AI feature is enabled */}
						{watch("features.ai") && (
							<div className="rounded-lg border border-slate-200 p-4">
								<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
									<i className="fa-solid fa-wand-magic-sparkles text-slate-500" aria-hidden />
									AI keys
								</div>
								<p className="mb-3 text-xs text-slate-500">
									Optional. This realm's own keys for AI insights and image
									generation; empty falls back to the platform keys.
								</p>
								<div className="grid grid-cols-1 gap-4">
									<Input
										label="OpenRouter API key"
										type="password"
										{...register("ai.openrouterKey")}
										placeholder={secretsSet.openrouterKey ? "configured - leave blank to keep" : "sk-or-..."}
										autoComplete="off"
									/>
									<Input
										label="Grok (xAI) image key"
										type="password"
										{...register("ai.grokImageKey")}
										placeholder={secretsSet.grokImageKey ? "configured - leave blank to keep" : "xai-..."}
										autoComplete="off"
									/>
								</div>
							</div>
						)}

						<SellerBlock
						register={register}
						errors={errors}
						needsSetup={
							!isNew &&
							data &&
							(!data.seller?.country || data.seller?.defaultRate == null)
						}
					/>

						{!isNew && id && (
							<PlatformBilling key={id} realmId={id} platform={data?.platform} />
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
