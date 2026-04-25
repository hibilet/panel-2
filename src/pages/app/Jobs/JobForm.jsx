import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
	Checkbox,
	Input,
	SearchableDropdown,
	Select,
} from "../../../components/inputs";
import { useApp } from "../../../context";
import { post, put } from "../../../lib/client";
import strings from "../../../localization";

const REPORT_TYPES = [
	{ value: "sales", labelKey: "form.job.reportType.sales" },
	{ value: "churn", labelKey: "form.job.reportType.churn" },
];

const FREQUENCIES = [
	{ value: "daily", labelKey: "form.job.frequency.daily" },
	{ value: "weekly", labelKey: "form.job.frequency.weekly" },
	{ value: "monthly", labelKey: "form.job.frequency.monthly" },
];

const buildJobType = (reportType, frequency) =>
	`report.${reportType}.${frequency}`;

const parseJobType = (type) => {
	const m = String(type ?? "").match(
		/^report\.(sales|churn)\.(daily|weekly|monthly)$/,
	);
	return m
		? { reportType: m[1], frequency: m[2] }
		: { reportType: "sales", frequency: "weekly" };
};

const JobForm = ({ job, definitions, onSaved }) => {
	const { sales } = useApp();
	const isEdit = !!job?.id;
	const initial = parseJobType(job?.type);

	const [reportType, setReportType] = useState(initial.reportType);
	const [frequency, setFrequency] = useState(initial.frequency);
	const [events, setEvents] = useState(
		job?.params?.sale ? [job.params.sale] : [],
	);
	const [countType, setCountType] = useState(
		job?.params?.countType ?? "single",
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const { register, handleSubmit, reset, watch } = useForm({
		defaultValues: {
			name: job?.name ?? "",
			enabled: job?.enabled !== false,
		},
	});

	useEffect(() => {
		const next = parseJobType(job?.type);
		setReportType(next.reportType);
		setFrequency(next.frequency);
		setEvents(job?.params?.sale ? [job.params.sale] : []);
		setCountType(job?.params?.countType ?? "single");
		reset({
			name: job?.name ?? "",
			enabled: job?.enabled !== false,
		});
	}, [job, reset]);

	const definition = useMemo(
		() =>
			(definitions ?? []).find(
				(d) => d.type === buildJobType(reportType, frequency),
			),
		[definitions, reportType, frequency],
	);

	const eventValue = isEdit ? events[0] ?? "" : events;

	const handleEventChange = (next) => {
		if (isEdit) {
			setEvents(next ? [next] : []);
		} else {
			setEvents(Array.isArray(next) ? next : next ? [next] : []);
		}
	};

	const onSubmit = async (data) => {
		setSaving(true);
		setError(null);
		const type = buildJobType(reportType, frequency);
		const schedule = definition?.defaultSchedule ?? "0 6 * * *";
		const baseBody = {
			type,
			schedule,
			enabled: data.enabled,
		};
		const buildParams = (saleId) => {
			const params = {};
			if (saleId) params.sale = saleId;
			if (reportType === "sales") params.countType = countType;
			return params;
		};

		try {
			if (isEdit) {
				const body = {
					...baseBody,
					name: data.name || undefined,
					params: buildParams(events[0]),
				};
				const res = await put(`/jobs/${job.id}`, body);
				onSaved?.(res?.data ?? { ...body, id: job.id });
			} else {
				const targets = events.length > 0 ? events : [null];
				let firstSaved = null;
				for (const saleId of targets) {
					const body = {
						...baseBody,
						name:
							data.name ||
							(saleId
								? `${strings(`form.job.reportType.${reportType}`)} - ${
										sales?.find((s) => s.id === saleId)?.name ?? saleId
									}`
								: undefined),
						params: buildParams(saleId),
					};
					const res = await post("/jobs", body);
					if (!firstSaved) firstSaved = res?.data ?? null;
				}
				onSaved?.(firstSaved);
			}
		} catch (err) {
			const key = err?.message;
			const localized = key ? strings(`jobError.${key}`) : null;
			setError(
				localized && localized !== `jobError.${key}`
					? localized
					: (err?.message ?? strings("error.failedSave")),
			);
		} finally {
			setSaving(false);
		}
	};

	const SegmentedButton = ({ active, onClick, children }) => (
		<button
			type="button"
			onClick={onClick}
			className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
				active
					? "border-slate-900 bg-slate-900 text-white"
					: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
			}`}
		>
			{children}
		</button>
	);

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			{error && (
				<div
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
					role="alert"
				>
					{error}
				</div>
			)}

			<div>
				<label className="block text-sm font-medium text-slate-700">
					{strings("form.job.reportType")}
				</label>
				<div className="mt-1 flex gap-2">
					{REPORT_TYPES.map((r) => (
						<SegmentedButton
							key={r.value}
							active={reportType === r.value}
							onClick={() => !isEdit && setReportType(r.value)}
						>
							{strings(r.labelKey)}
						</SegmentedButton>
					))}
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-slate-700">
					{strings("form.job.frequency")}
				</label>
				<div className="mt-1 flex gap-2">
					{FREQUENCIES.map((f) => (
						<SegmentedButton
							key={f.value}
							active={frequency === f.value}
							onClick={() => !isEdit && setFrequency(f.value)}
						>
							{strings(f.labelKey)}
						</SegmentedButton>
					))}
				</div>
			</div>

			<div>
				<SearchableDropdown
					label={strings("form.job.events")}
					name="events"
					multi={!isEdit}
					value={eventValue}
					onChange={handleEventChange}
					options={sales ?? []}
					getOptionLabel={(s) => s?.name ?? "—"}
					getOptionValue={(s) => s?.id ?? ""}
					placeholder={strings("form.job.eventsAll")}
				/>
				<p className="mt-1 text-xs text-slate-500">
					{strings(isEdit ? "form.job.eventsHelpEdit" : "form.job.eventsHelp")}
				</p>
			</div>

			{reportType === "sales" && (
				<div>
					<label className="block text-sm font-medium text-slate-700">
						{strings("form.job.countType")}
					</label>
					<div className="mt-1 flex gap-2">
						<SegmentedButton
							active={countType === "single"}
							onClick={() => setCountType("single")}
						>
							{strings("form.job.countSingle")}
						</SegmentedButton>
						<SegmentedButton
							active={countType === "cumulative"}
							onClick={() => setCountType("cumulative")}
						>
							{strings("form.job.countCumulative")}
						</SegmentedButton>
					</div>
				</div>
			)}

			<Input
				label={strings("form.job.name")}
				name="name"
				{...register("name")}
				placeholder={definition?.label ?? ""}
			/>

			<Checkbox
				label={strings("form.job.enabled")}
				name="enabled"
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
						<>
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							{!isEdit && events.length > 1
								? strings("form.job.savingMultiple", [events.length])
								: strings("common.saving")}
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
	);
};

export default JobForm;
