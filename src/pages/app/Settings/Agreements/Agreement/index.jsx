import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Textarea } from "../../../../../components/inputs";
import { get, post, put } from "../../../../../lib/client";
import strings from "../../../../../localization";

const defaultValues = { name: "", content: "" };

const AgreementPanel = ({ id, onClose, onSaved, onAgreementAdded, onAgreementUpdated }) => {
	const isNew = id === "new";
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

	useEffect(() => {
		if (isNew) {
			setLoading(false);
			setData(null);
			reset(defaultValues);
			return;
		}
		setLoading(true);
		setError(null);
		get(`/agreements/${id}`)
			.then((res) => {
				const d = res.data ?? null;
				setData(d);
				if (d) {
					reset({
						name: d.name ?? "",
						content: d.content ?? "",
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
				content: formData.content?.trim() || undefined,
				type: "sales"
			};
			if (isNew) {
				const res = await post("/agreements", payload);
				const created = res.data ?? null;
				setData(created);
				onAgreementAdded?.(created);
				onSaved?.(created?.id);
			} else {
				const res = await put(`/agreements/${id}`, payload);
				const updated = res.data ?? payload;
				setData((prev) => (prev ? { ...prev, ...updated } : null));
				onAgreementUpdated?.(id, updated);
				onSaved?.();
			}
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex h-full flex-col">
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
					<h2 className="text-lg font-semibold text-slate-900">
						{isNew
							? strings("form.agreement.newTitle")
							: strings("form.agreement.editTitle")}
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
						? strings("form.agreement.newTitle")
						: (data?.name ?? strings("form.agreement.editTitle"))}
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
								label={`${strings("form.agreement.name")} *`}
								{...register("name", { required: strings("error.required") })}
								error={errors.name?.message}
								placeholder={strings("form.agreement.namePlaceholder")}
							/>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<Textarea
								label={`${strings("form.agreement.content")} *`}
								{...register("content", { required: strings("error.required") })}
								error={errors.content?.message}
								placeholder={strings("form.agreement.contentPlaceholder")}
								rows={16}
								className="min-h-[300px] font-mono text-sm"
							/>
						</div>
					</div>
				</div>

				<footer className="shrink-0 border-t border-slate-200 px-6 py-4">
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
				</footer>
			</form>
		</div>
	);
};

export default AgreementPanel;
