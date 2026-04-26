import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Checkbox, Input } from "../../../components/inputs";
import { put } from "../../../lib/client";
import strings from "../../../localization";

const JobForm = ({ job, onSaved }) => {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, watch } = useForm({
		defaultValues: {
			name: job?.name ?? "",
			schedule: job?.schedule ?? "",
			enabled: job?.enabled !== false,
		},
	});

	useEffect(() => {
		reset({
			name: job?.name ?? "",
			schedule: job?.schedule ?? "",
			enabled: job?.enabled !== false,
		});
	}, [job, reset]);

	const onSubmit = async (data) => {
		if (!job?.id) return;
		setSaving(true);
		setError(null);
		try {
			const res = await put(`/jobs/${job.id}`, {
				name: data.name || undefined,
				schedule: data.schedule || undefined,
				enabled: data.enabled,
			});
			onSaved?.(res?.data ?? { ...data, id: job.id });
		} catch (err) {
			setError(err?.message ?? strings("error.failedSave"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}
			<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
				<i className="fa-solid fa-circle-info mr-1.5" aria-hidden />
				<span className="font-mono">{job?.type}</span>
				{job?.system && (
					<span className="ml-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs">
						{strings("page.jobs.system")}
					</span>
				)}
			</div>
			<Input label={strings("form.job.name")} {...register("name")} />
			<Input
				label={strings("form.job.schedule")}
				{...register("schedule")}
				placeholder="59 23 * * *"
			/>
			<Checkbox
				label={strings("form.job.enabled")}
				{...register("enabled")}
				defaultChecked={watch("enabled")}
			/>
			<div className="pt-2">
				<button
					type="submit"
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{saving ? (
						<i className="fa-solid fa-spinner fa-spin" aria-hidden />
					) : (
						<i className="fa-solid fa-floppy-disk" aria-hidden />
					)}
					{strings("common.save")}
				</button>
			</div>
		</form>
	);
};

export default JobForm;
