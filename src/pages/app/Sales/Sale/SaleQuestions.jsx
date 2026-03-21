import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useParams } from "wouter";
import { Checkbox, Input, Select } from "../../../../components/inputs";
import { EmptyState, SlidePanel } from "../../../../components/shared";
import DataTable from "../../../../components/tables/DataTable";
import { put } from "../../../../lib/client";
import strings from "../../../../localization";

const QUESTION_TYPES = [
	"text",
	"number",
	"boolean",
	"date",
	"time",
	"datetime",
	"email",
	"phone",
	"url",
	"select",
	"multiple-select",
];

const TYPE_LABELS = {
	text: "Text",
	number: "Number",
	boolean: "Yes/No",
	date: "Date",
	time: "Time",
	datetime: "Date & Time",
	email: "Email",
	phone: "Phone",
	url: "URL",
	select: "Select (single)",
	"multiple-select": "Multiple select",
};

const questionColumns = [
	{
		key: "question",
		header: strings("form.question.question"),
		render: (r) => r.question ?? "—",
	},
	{
		key: "type",
		header: strings("form.question.type"),
		render: (r) => TYPE_LABELS[r.type] ?? r.type ?? "—",
	},
	{
		key: "required",
		header: strings("form.question.required"),
		align: "center",
		render: (r) => (r.required ? "✓" : "—"),
	},
];

const getInitialForm = (question) => {
	if (question) {
		return {
			question: question.question ?? "",
			type: question.type ?? "text",
			options: (question.options ?? []).join("\n"),
			required: question.required ?? false,
		};
	}
	return {
		question: "",
		type: "text",
		options: "",
		required: false,
	};
};

const needsOptions = (type) =>
	type === "select" || type === "multiple-select";

const SaleQuestions = ({ sale, setSale }) => {
	const { id } = useParams();
	const isNew = id === "new";

	const questions = sale?.questions ?? [];
	const loading = !isNew && sale === undefined;

	const [error, setError] = useState(null);
	const [panelQuestion, setPanelQuestion] = useState(null);
	const [saving, setSaving] = useState(null);
	const [deleting, setDeleting] = useState(null);

	const panelOpen = panelQuestion !== null;
	const isAdding = panelQuestion === "new";

	const closePanel = useCallback(() => setPanelQuestion(null), []);

	const updateSaleQuestions = useCallback(
		async (updatedQuestions) => {
			setSaving("questions");
			setError(null);
			try {
				const res = await put(`/sales/${id}`, {
					questions: updatedQuestions,
				});
				setSale?.(res.data);
				closePanel();
			} catch (err) {
				setError(err?.message ?? strings("error.failedSave"));
			} finally {
				setSaving(null);
			}
		},
		[id, setSale, closePanel],
	);

	const handleSave = async (question, payload) => {
		const list = [...questions];
		if (question?.id) {
			const idx = list.findIndex((q) => q.id === question.id || q._id === question.id);
			if (idx >= 0) list[idx] = { ...list[idx], ...payload };
		} else {
			list.push(payload);
		}
		await updateSaleQuestions(list);
	};

	const handleDelete = async (question) => {
		if (!confirm(strings("form.question.confirmDelete"))) return;
		const qId = question.id ?? question._id;
		setDeleting(qId);
		setError(null);
		try {
			const list = questions.filter(
				(q) => (q.id ?? q._id) !== qId,
			);
			await updateSaleQuestions(list);
		} catch (err) {
			setError(err?.message ?? strings("error.failedDelete"));
		} finally {
			setDeleting(null);
		}
	};

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape" && panelOpen) closePanel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [panelOpen, closePanel]);

	const getRowKey = (r) => r.id ?? r._id ?? Math.random();

	if (loading && questions.length === 0) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
				<div className="space-y-2">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="relative">
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-lg font-medium text-slate-900">
							{strings("form.question.title")}
						</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{questions.length === 1
								? strings("form.question.count", [questions.length])
								: strings("form.question.countPlural", [questions.length])}
						</p>
					</div>
					{!isNew && (
						<button
							type="button"
							onClick={() => setPanelQuestion("new")}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
						>
							<i className="fa-solid fa-plus" aria-hidden />
							{strings("form.question.addQuestion")}
						</button>
					)}
				</div>

				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
						{error}
					</div>
				)}

				{isNew ? (
					<EmptyState
						icon="fa-question-circle"
						variant="amber"
						title={strings("form.question.saveFirst")}
						description={strings("form.question.saveFirstDesc")}
					/>
				) : questions.length === 0 ? (
					<EmptyState
						icon="fa-question-circle"
						title={strings("form.question.noQuestions")}
						description={strings("form.question.noQuestionsDesc")}
						action={
							<button
								type="button"
								onClick={() => setPanelQuestion("new")}
								className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
							>
								<i className="fa-solid fa-plus" aria-hidden />
								{strings("form.question.addQuestion")}
							</button>
						}
					/>
				) : (
					<DataTable
						data={questions}
						columns={questionColumns}
						getRowKey={getRowKey}
						onRowClick={setPanelQuestion}
					/>
				)}
			</div>

			<SlidePanel
				isOpen={panelOpen}
				onClose={closePanel}
				title={
					isAdding
						? strings("form.question.addQuestionPanel")
						: strings("form.question.editQuestionPanel")
				}
				aria-label={
					isAdding
						? strings("form.question.addQuestionPanel")
						: strings("form.question.editQuestionPanel")
				}
			>
				<QuestionPanel
					key={isAdding ? "new" : (panelQuestion?.id ?? panelQuestion?._id ?? "edit")}
					question={isAdding ? null : panelQuestion}
					onSave={handleSave}
					onDelete={handleDelete}
					onClose={closePanel}
					saving={saving}
					deleting={deleting}
				/>
			</SlidePanel>
		</div>
	);
};

const QuestionPanel = ({
	question,
	onSave,
	onDelete,
	onClose,
	saving,
	deleting,
}) => {
	const isNew = question === null;
	const defaultValues = getInitialForm(question);
	const { register, handleSubmit, reset, control } = useForm({
		defaultValues,
	});
	const type = useWatch({ control, name: "type", defaultValue: "text" });

	useEffect(() => {
		reset(getInitialForm(question));
	}, [question, reset]);

	const onFormSubmit = (formData) => {
		const optionsStr = (formData.options ?? "").trim();
		const options = optionsStr
			? optionsStr
					.split(/[\n,]+/)
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined;

		const payload = {
			question: formData.question || undefined,
			type: formData.type || "text",
			options: needsOptions(formData.type) ? (options ?? []) : undefined,
			required: formData.required ?? false,
		};
		if (question?.id) payload.id = question.id;
		if (question?._id) payload._id = question._id;
		onSave(question, payload);
	};

	return (
		<div className="flex h-full flex-col">
			<header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
				<h3 className="text-lg font-semibold text-slate-900">
					{isNew
						? strings("form.question.newQuestion")
						: question?.question || strings("form.question.editQuestion")}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
					aria-label={strings("common.ariaClose")}
				>
					<i className="fa-solid fa-xmark text-lg" aria-hidden />
				</button>
			</header>

			<form
				onSubmit={handleSubmit(onFormSubmit)}
				className="flex flex-1 flex-col overflow-hidden"
			>
				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-5">
						<div className="space-y-4">
							<h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
								{strings("common.details")}
							</h4>
							<Input
								label={strings("form.question.question")}
								{...register("question", { required: true })}
								placeholder={strings("form.question.questionPlaceholder")}
							/>
							<Select
								label={strings("form.question.type")}
								{...register("type")}
								options={QUESTION_TYPES.map((t) => ({
									value: t,
									label: TYPE_LABELS[t],
								}))}
							/>
							{needsOptions(type) && (
								<div>
									<label
										htmlFor="question-options"
										className="mb-1 block text-sm font-medium text-slate-700"
									>
										{strings("form.question.options")}
									</label>
									<textarea
										id="question-options"
										{...register("options")}
										rows={4}
										placeholder={strings("form.question.optionsPlaceholder")}
										className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
									/>
								</div>
							)}
							<Checkbox
								label={strings("form.question.required")}
								{...register("required")}
							/>
						</div>
					</div>
				</div>

				<footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<div className="flex flex-wrap gap-3">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
						>
							{saving ? (
								<>
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
									{strings("common.saving")}
								</>
							) : isNew ? (
								strings("form.question.createQuestion")
							) : (
								strings("form.ticket.saveChanges")
							)}
						</button>
						{isNew ? (
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								{strings("common.cancel")}
							</button>
						) : (
							<button
								type="button"
								onClick={() => onDelete(question)}
								disabled={deleting}
								className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{deleting ? (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								) : (
									strings("common.delete")
								)}
							</button>
						)}
					</div>
				</footer>
			</form>
		</div>
	);
};

export default SaleQuestions;
