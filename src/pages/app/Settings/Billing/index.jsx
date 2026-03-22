import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { Checkbox, Input } from "../../../../components/inputs";
import { useApp } from "../../../../context";
import { get, post, put } from "../../../../lib/client";
import strings from "../../../../localization";

const Billing = () => {
	const [, setLocation] = useLocation();
	const { refreshAccount } = useApp();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [billing, setBilling] = useState(null);

	const { register, handleSubmit, reset } = useForm({
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			newsletter: false,
			address: "",
			corporateName: "",
			corporateRegistry: "",
			corporateTax: "",
		},
	});

	useEffect(() => {
		setError(null);
		get("/billings/my")
			.then((res) => {
				const data = res.data;
				if (data) {
					setBilling(data);
					reset({
						name: data.name ?? "",
						email: data.email ?? "",
						phone: data.phone ?? "",
						newsletter: data.newsletter ?? false,
						address: data.address ?? "",
						corporateName: data.corporate?.name ?? "",
						corporateRegistry: data.corporate?.registry ?? "",
						corporateTax: data.corporate?.tax ?? "",
					});
				}
			})
			.catch((err) =>
				setError(err?.message ?? strings("error.failedLoadBilling")),
			)
			.finally(() => setLoading(false));
	}, [reset]);

	const onSave = async (data) => {
		setSaving(true);
		setError(null);
		try {
			const payload = {
				name: data.name?.trim() || undefined,
				email: data.email?.trim(),
				phone: data.phone?.trim() || undefined,
				newsletter: !!data.newsletter,
				address: data.address?.trim() || undefined,
				corporate: {
					name: data.corporateName?.trim(),
					registry: data.corporateRegistry?.trim(),
					tax: data.corporateTax?.trim() || undefined,
				},
				type: "billing.merchant",
			};
			if (billing?.id) {
				await put(`/billings/${billing.id}`, payload);
				setBilling((prev) => (prev ? { ...prev, ...payload } : null));
			} else {
				const res = await post("/billings", payload);
				setBilling(res.data ?? payload);
			}
			refreshAccount?.();
			setLocation("/settings");
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			<Link
				href="/settings"
				className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.settings")}
			</Link>

			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
					<i
						className="fa-solid fa-file-invoice text-slate-600 dark:text-slate-400"
						aria-hidden
					/>
					{strings("page.settings.billingSetup")}
				</h1>

				{loading ? (
					<div className="flex flex-1 items-center justify-center py-12">
						<i
							className="fa-solid fa-spinner fa-spin text-3xl text-slate-400"
							aria-hidden
						/>
					</div>
				) : (
					<form onSubmit={handleSubmit(onSave)} className="space-y-6">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
								{error}
							</div>
						)}

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Input
								label={strings("form.billing.name")}
								{...register("name")}
								placeholder={strings("form.billing.namePlaceholder")}
								autoComplete="name"
							/>
							<Input
								label={strings("form.billing.email")}
								type="email"
								required
								{...register("email")}
								placeholder={strings("form.billing.emailPlaceholder")}
								autoComplete="email"
							/>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Input
								label={strings("form.billing.phone")}
								type="tel"
								{...register("phone")}
								placeholder={strings("form.billing.phonePlaceholder")}
								autoComplete="tel"
							/>
							<Input
								label={strings("form.billing.address")}
								{...register("address")}
								placeholder={strings("form.billing.addressPlaceholder")}
								autoComplete="street-address"
							/>
						</div>

						<Checkbox
							label={strings("form.billing.newsletter")}
							{...register("newsletter")}
						/>

						<div className="border-t border-slate-200 pt-6 dark:border-slate-700">
							<h2 className="mb-4 text-lg font-medium text-slate-900 dark:text-white">
								{strings("form.billing.corporateSection")}
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Input
									label={strings("form.billing.corporateName")}
									required
									{...register("corporateName")}
									placeholder={strings("form.billing.corporateNamePlaceholder")}
								/>
								<Input
									label={strings("form.billing.corporateRegistry")}
									required
									{...register("corporateRegistry")}
									placeholder={strings("form.billing.corporateRegistryPlaceholder")}
								/>
								<Input
									label={strings("form.billing.corporateTax")}
									{...register("corporateTax")}
									placeholder={strings("form.billing.corporateTaxPlaceholder")}
								/>
							</div>
						</div>

						<div className="pt-4">
							<button
								type="submit"
								disabled={saving}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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

export default Billing;
