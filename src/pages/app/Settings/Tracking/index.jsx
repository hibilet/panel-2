import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { Input } from "../../../../components/inputs";
import { useApp } from "../../../../context";
import { put } from "../../../../lib/client";
import strings from "../../../../localization";

const Tracking = () => {
	const [, setLocation] = useLocation();
	const { account, refreshAccount } = useApp();
	const meta = account?.tracking?.meta;
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		defaultValues: {
			pixelId: meta?.pixelId ?? "",
			capiToken: "",
			testEventCode: meta?.testEventCode ?? "",
		},
	});

	// An empty capiToken means "keep the saved one"; clearing is explicit.
	const save = async (tracking) => {
		setSaving(true);
		setError(null);
		try {
			await put("/accounts/me", { tracking: { meta: tracking } });
			await refreshAccount?.();
			setLocation("/settings");
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	const onSave = (data) =>
		save({
			pixelId: data.pixelId.trim(),
			testEventCode: data.testEventCode.trim(),
			...(data.capiToken.trim() && { capiToken: data.capiToken.trim() }),
		});

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
				<h1 className="mb-2 text-2xl font-semibold text-slate-900">
					{strings("page.settings.tracking")}
				</h1>
				<p className="mb-6 text-sm text-slate-500">
					{strings("page.tracking.intro")}
				</p>

				<form onSubmit={handleSubmit(onSave)} className="space-y-6">
					{error && (
						<div
							className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
							role="alert"
						>
							{error}
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Input
							label={strings("page.tracking.pixelId")}
							{...register("pixelId", {
								setValueAs: (v) => v.trim(),
								pattern: {
									value: /^\d{0,20}$/,
									message: strings("page.tracking.pixelIdInvalid"),
								},
							})}
							error={errors.pixelId?.message}
							inputMode="numeric"
							placeholder="724681860659709"
						/>
						<Input
							label={strings("page.tracking.testCode")}
							{...register("testEventCode")}
							placeholder="TEST12345"
						/>
					</div>
					<p className="-mt-3 text-xs text-slate-500">
						{strings("page.tracking.testCodeHelp")}
					</p>

					<div>
						<Input
							label={strings("page.tracking.token")}
							type="password"
							autoComplete="new-password"
							{...register("capiToken")}
							placeholder={
								meta?.capiSet ? strings("page.tracking.tokenSet") : ""
							}
						/>
						<p className="mt-1 text-xs text-slate-500">
							{strings("page.tracking.tokenHelp")}
						</p>
						{meta?.capiSet && (
							<button
								type="button"
								disabled={saving}
								onClick={() => save({ capiToken: "" })}
								className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
							>
								{strings("page.tracking.removeToken")}
							</button>
						)}
					</div>

					<div className="pt-4">
						<button
							type="submit"
							disabled={saving}
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
					</div>
				</form>
			</div>
		</div>
	);
};

export default Tracking;
