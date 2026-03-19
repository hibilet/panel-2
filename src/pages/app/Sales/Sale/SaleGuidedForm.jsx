import { useState } from "react";
import { Textarea } from "../../../../components/inputs";
import { Modal } from "../../../../components/shared";
import { useApp } from "../../../../context";
import { chatCompletion } from "../../../../lib/openrouter";
import strings from "../../../../localization";
import { saleMasterPrompt } from "../../../../utils/prompts";

const extractJson = (text) => {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		return JSON.parse(match[0]);
	} catch {
		return null;
	}
};

const SaleGuidedForm = ({ onClose }) => {
	const { venues, agreements, providers } = useApp();
	const masterPrompt = saleMasterPrompt({ venues, agreements, providers });
	const [description, setDescription] = useState("");
	const [generating, setGenerating] = useState(false);
	const [generatedJson, setGeneratedJson] = useState(null);
	const [error, setError] = useState(null);

	const handleGenerate = async () => {
		setGenerating(true);
		setError(null);
		setGeneratedJson(null);
		try {
			const userPrompt =
				description.trim() || "Create a sale for me with default values.";
			const content = await chatCompletion({
				systemPrompt: masterPrompt,
				userPrompt,
			});
			const parsed = extractJson(content);
			setGeneratedJson(parsed ?? { raw: content });
		} catch (err) {
			setError(err?.message ?? "Failed to generate");
		} finally {
			setGenerating(false);
		}
	};

	return (
		<Modal
			isOpen
			onClose={onClose}
			title={strings("page.sale.guided.title")}
			maxWidth="6xl"
			footer={
				<button
					type="button"
					disabled={generating}
					onClick={handleGenerate}
					className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
				>
					{generating ? (
						<>
							<i className="fa-solid fa-spinner fa-spin" aria-hidden />
							{strings("page.sale.guided.generating")}
						</>
					) : (
						<>
							<i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
							{strings("page.sale.guided.generate")}
						</>
					)}
				</button>
			}
		>
			<div className="flex flex-col gap-4">
				<p className="text-slate-600">{strings("page.sale.guided.subtitle")}</p>
				<details className="group rounded-lg border border-slate-200 bg-slate-50">
					<summary className="cursor-pointer px-4 py-3 font-medium text-slate-900 hover:bg-slate-100">
						{strings("page.sale.guided.masterPrompt")}
					</summary>
					<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-white p-4 text-xs text-slate-700">
						{masterPrompt}
					</pre>
				</details>
				<Textarea
					label={strings("page.sale.guided.textareaLabel")}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder={strings("page.sale.guided.textareaPlaceholder")}
					rows={6}
					className="min-h-[140px]"
				/>
				{generating && (
					<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
						<i
							className="fa-solid fa-spinner fa-spin text-slate-500"
							aria-hidden
						/>
						<span className="text-sm text-slate-600">
							{strings("page.sale.guided.generating")}
						</span>
					</div>
				)}
				{generatedJson && !generating && (
					<div className="rounded-lg border border-slate-200 bg-slate-50">
						<h3 className="border-b border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
							{strings("page.sale.guided.generatedJson")}
						</h3>
						<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-4 text-xs text-slate-700">
							{JSON.stringify(generatedJson, null, 2)}
						</pre>
					</div>
				)}
				{error && (
					<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
						{error}
					</div>
				)}
			</div>
		</Modal>
	);
};

export default SaleGuidedForm;
