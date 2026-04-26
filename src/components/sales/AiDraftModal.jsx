import dayjs from "dayjs";
import { useState } from "react";
import { useLocation } from "wouter";
import { Input, Select, Textarea } from "../inputs";
import { Modal } from "../shared";
import { useApp, useToast } from "../../context";
import { post, postForm } from "../../lib/client";
import { getLang } from "../../lib/storage";
import strings from "../../localization";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const formatDateTimeLocal = (iso) => {
	if (!iso) return "";
	const d = dayjs(iso);
	return d.isValid() ? d.format("YYYY-MM-DDTHH:mm") : "";
};

const toApiDateTime = (local) => {
	if (!local) return undefined;
	const d = dayjs(local);
	return d.isValid() ? d.format("YYYY-MM-DD HH:mm") : undefined;
};

const blankInputs = { text: "", csv: "", file: null };

const AiDraftModal = ({ isOpen, onClose, onCreated }) => {
	const [, setLocation] = useLocation();
	const { venues, agreements, providers, addSale } = useApp();
	const { show: showToast } = useToast();

	const [tab, setTab] = useState("text");
	const [inputs, setInputs] = useState(blankInputs);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [drafts, setDrafts] = useState(null);
	const [notes, setNotes] = useState(null);
	const [creatingIdx, setCreatingIdx] = useState(null);

	const reset = () => {
		setTab("text");
		setInputs(blankInputs);
		setSubmitting(false);
		setError(null);
		setDrafts(null);
		setNotes(null);
		setCreatingIdx(null);
	};

	const handleClose = () => {
		if (submitting || creatingIdx !== null) return;
		reset();
		onClose?.();
	};

	const hasInput =
		(inputs.text && inputs.text.trim().length > 0) ||
		(inputs.csv && inputs.csv.trim().length > 0) ||
		inputs.file != null;

	const handleFile = (file) => {
		if (!file) {
			setInputs((p) => ({ ...p, file: null }));
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setError(strings("ai.draft.error.imageTooLarge"));
			return;
		}
		setError(null);
		setInputs((p) => ({ ...p, file }));
	};

	const handleSubmit = async () => {
		if (!hasInput) {
			setError(strings("ai.draft.error.noInput"));
			return;
		}
		setSubmitting(true);
		setError(null);
		const lang = getLang() || "en";
		try {
			let res;
			if (inputs.file) {
				const fd = new FormData();
				fd.append("file", inputs.file);
				if (inputs.text) fd.append("text", inputs.text);
				fd.append("language", lang);
				res = await postForm("/sales/ai/draft", fd);
			} else {
				res = await post("/sales/ai/draft", {
					text: inputs.text || undefined,
					csv: inputs.csv || undefined,
					language: lang,
				});
			}
			const events = (res?.data?.events ?? []).map((ev) => ({
				...ev,
				start: formatDateTimeLocal(ev.start),
				end: formatDateTimeLocal(ev.end),
				stopSaleAt: formatDateTimeLocal(ev.stopSaleAt),
				venueId: "",
				agreement: agreements?.[0]?.id ?? "",
				provider: providers?.[0]?.id ?? "",
				_warnings: res?.data?.warnings ?? [],
			}));
			setDrafts(events);
			setNotes(res?.data?.notes ?? null);
		} catch (err) {
			if (err?.__sessionExpired) return;
			const msg = err?.message;
			if (msg === "sale-ai-draft-parse-failed") {
				setError(strings("ai.draft.error.parseFailed"));
			} else if (msg === "sale-ai-draft-failed") {
				setError(strings("ai.draft.error.failed"));
			} else if (msg === "sale-ai-draft" || msg === "no-input") {
				setError(strings("ai.draft.error.noInput"));
			} else {
				setError(msg ?? strings("ai.draft.error.failed"));
			}
		} finally {
			setSubmitting(false);
		}
	};

	const updateDraft = (idx, patch) => {
		setDrafts((prev) =>
			prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
		);
	};

	const updateProduct = (idx, pIdx, patch) => {
		setDrafts((prev) =>
			prev.map((d, i) =>
				i === idx
					? {
							...d,
							products: d.products.map((p, j) =>
								j === pIdx ? { ...p, ...patch } : p,
							),
						}
					: d,
			),
		);
	};

	const handleAccept = async (idx) => {
		const draft = drafts[idx];
		setCreatingIdx(idx);
		try {
			const salePayload = {
				name: draft.name,
				category: draft.category,
				currency: draft.currency,
				start: toApiDateTime(draft.start),
				end: toApiDateTime(draft.end),
				stopSaleAt: toApiDateTime(draft.stopSaleAt),
				rules: draft.rules || undefined,
				minAge: draft.minAge ?? undefined,
				seated: !!draft.seated,
				...(draft.venueId ? { venue: draft.venueId } : {}),
				...(draft.agreement ? { agreement: draft.agreement } : {}),
				...(draft.provider ? { provider: draft.provider } : {}),
			};
			const saleRes = await post("/sales", salePayload);
			const saleId = saleRes?.data?.id ?? saleRes?.data?._id;
			if (saleRes?.data) addSale(saleRes.data);
			if (saleId && Array.isArray(draft.products)) {
				for (const p of draft.products) {
					await post("/products", {
						name: p.name,
						price: Number(p.price) || 0,
						stock: Number(p.stock) || 0,
						category: p.category,
						sale: saleId,
						type: "product.event",
					});
				}
			}
			showToast("success", strings("ai.draft.created", [draft.name]));
			setDrafts((prev) => prev.filter((_, i) => i !== idx));
			onCreated?.(saleRes?.data);
			if (drafts.length === 1 && saleId) {
				reset();
				onClose?.();
				setLocation(`/sales/${saleId}`);
			}
		} catch {
			// toast handled by client
		} finally {
			setCreatingIdx(null);
		}
	};

	const handleReject = (idx) => {
		setDrafts((prev) => prev.filter((_, i) => i !== idx));
	};

	const venueOptions = (venues ?? []).map((v) => ({
		value: v.id ?? v._id,
		label: v.name + (v.city ? ` - ${v.city}` : ""),
	}));
	const agreementOptions = (agreements ?? []).map((a) => ({
		value: a.id ?? a._id,
		label: a.name ?? a.title ?? "-",
	}));
	const providerOptions = (providers ?? []).map((p) => ({
		value: p.id ?? p._id,
		label: p.name ?? "-",
	}));

	const inputView = (
		<>
			<p className="mb-4 text-sm text-slate-600">
				{strings("ai.draft.modal.subtitle")}
			</p>
			<div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
				{[
					{ id: "text", label: strings("ai.draft.tabs.text") },
					{ id: "csv", label: strings("ai.draft.tabs.csv") },
					{ id: "poster", label: strings("ai.draft.tabs.poster") },
				].map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTab(t.id)}
						className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
							tab === t.id
								? "bg-white text-slate-900 shadow-sm"
								: "text-slate-600 hover:text-slate-900"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>
			{tab === "text" && (
				<Textarea
					name="aiDraftText"
					rows={6}
					value={inputs.text}
					onChange={(e) =>
						setInputs((p) => ({ ...p, text: e.target.value }))
					}
					placeholder={strings("ai.draft.text.placeholder")}
					disabled={submitting}
				/>
			)}
			{tab === "csv" && (
				<Textarea
					name="aiDraftCsv"
					rows={8}
					value={inputs.csv}
					onChange={(e) =>
						setInputs((p) => ({ ...p, csv: e.target.value }))
					}
					placeholder={strings("ai.draft.csv.placeholder")}
					disabled={submitting}
					className="font-mono text-xs"
				/>
			)}
			{tab === "poster" && (
				<div>
					<input
						type="file"
						accept="image/*"
						onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
						disabled={submitting}
						className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
					/>
					<p className="mt-2 text-xs text-slate-500">
						{strings("ai.draft.poster.hint")}
					</p>
					{inputs.file && (
						<p className="mt-2 text-xs text-slate-700">
							{inputs.file.name} ({Math.round(inputs.file.size / 1024)} KB)
						</p>
					)}
				</div>
			)}
			{error && (
				<p className="mt-3 text-sm text-red-600" role="alert">
					{error}
				</p>
			)}
		</>
	);

	const reviewView = drafts && (
		<>
			{notes && (
				<div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
					<span className="font-medium">{strings("ai.draft.review.notes")}:</span>{" "}
					{notes}
				</div>
			)}
			{drafts.length === 0 && (
				<p className="text-sm text-slate-500">
					{strings("ai.draft.error.noInput")}
				</p>
			)}
			<div className="space-y-4">
				{drafts.map((draft, idx) => (
					<div
						key={idx}
						className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
					>
						{draft._warnings?.length > 0 && (
							<ul className="mb-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
								{draft._warnings.map((w, i) => (
									<li key={i}>- {w}</li>
								))}
							</ul>
						)}
						<div className="grid gap-3 sm:grid-cols-2">
							<Input
								label={strings("ai.draft.event.name")}
								name={`d-${idx}-name`}
								value={draft.name ?? ""}
								onChange={(e) => updateDraft(idx, { name: e.target.value })}
							/>
							<Input
								label={strings("ai.draft.event.category")}
								name={`d-${idx}-cat`}
								value={draft.category ?? ""}
								onChange={(e) =>
									updateDraft(idx, { category: e.target.value })
								}
							/>
							<Input
								label={strings("ai.draft.event.start")}
								type="datetime-local"
								name={`d-${idx}-start`}
								value={draft.start ?? ""}
								onChange={(e) => updateDraft(idx, { start: e.target.value })}
							/>
							<Input
								label={strings("ai.draft.event.end")}
								type="datetime-local"
								name={`d-${idx}-end`}
								value={draft.end ?? ""}
								onChange={(e) => updateDraft(idx, { end: e.target.value })}
							/>
							<Input
								label={strings("ai.draft.event.stopSaleAt")}
								type="datetime-local"
								name={`d-${idx}-stop`}
								value={draft.stopSaleAt ?? ""}
								onChange={(e) =>
									updateDraft(idx, { stopSaleAt: e.target.value })
								}
							/>
							<Input
								label={strings("ai.draft.event.minAge")}
								type="number"
								name={`d-${idx}-age`}
								value={draft.minAge ?? ""}
								onChange={(e) =>
									updateDraft(idx, {
										minAge: e.target.value ? Number(e.target.value) : undefined,
									})
								}
							/>
						</div>
						<div className="mt-3">
							<Textarea
								label={strings("ai.draft.event.rules")}
								name={`d-${idx}-rules`}
								rows={2}
								value={draft.rules ?? ""}
								onChange={(e) => updateDraft(idx, { rules: e.target.value })}
							/>
						</div>
						<div className="mt-3 grid gap-3 sm:grid-cols-3">
							<Select
								label={strings("ai.draft.event.venue")}
								name={`d-${idx}-venue`}
								value={draft.venueId ?? ""}
								onChange={(e) => updateDraft(idx, { venueId: e.target.value })}
								options={venueOptions}
								placeholder={
									draft.venue?.name
										? `${draft.venue.name}${draft.venue.city ? ` - ${draft.venue.city}` : ""}`
										: "-"
								}
							/>
							<Select
								label={strings("ai.draft.event.agreement")}
								name={`d-${idx}-agr`}
								value={draft.agreement ?? ""}
								onChange={(e) =>
									updateDraft(idx, { agreement: e.target.value })
								}
								options={agreementOptions}
							/>
							<Select
								label={strings("ai.draft.event.provider")}
								name={`d-${idx}-prov`}
								value={draft.provider ?? ""}
								onChange={(e) =>
									updateDraft(idx, { provider: e.target.value })
								}
								options={providerOptions}
							/>
						</div>
						<div className="mt-4">
							<p className="mb-2 text-sm font-medium text-slate-700">
								{strings("ai.draft.products.title")}
							</p>
							<div className="space-y-2">
								{(draft.products ?? []).map((p, pIdx) => (
									<div
										key={pIdx}
										className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-4"
									>
										<Input
											name={`d-${idx}-p-${pIdx}-name`}
											value={p.name ?? ""}
											onChange={(e) =>
												updateProduct(idx, pIdx, { name: e.target.value })
											}
											placeholder={strings("ai.draft.products.name")}
										/>
										<Input
											type="number"
											step="0.01"
											name={`d-${idx}-p-${pIdx}-price`}
											value={p.price ?? ""}
											onChange={(e) =>
												updateProduct(idx, pIdx, { price: e.target.value })
											}
											placeholder={strings("ai.draft.products.price")}
										/>
										<Input
											type="number"
											name={`d-${idx}-p-${pIdx}-stock`}
											value={p.stock ?? ""}
											onChange={(e) =>
												updateProduct(idx, pIdx, { stock: e.target.value })
											}
											placeholder={strings("ai.draft.products.stock")}
										/>
										<Input
											name={`d-${idx}-p-${pIdx}-cat`}
											value={p.category ?? ""}
											onChange={(e) =>
												updateProduct(idx, pIdx, { category: e.target.value })
											}
											placeholder={strings("ai.draft.products.category")}
										/>
									</div>
								))}
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => handleReject(idx)}
								disabled={creatingIdx !== null}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{strings("ai.draft.reject")}
							</button>
							<button
								type="button"
								onClick={() => handleAccept(idx)}
								disabled={creatingIdx !== null || !draft.name}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{creatingIdx === idx && (
									<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								)}
								{creatingIdx === idx
									? strings("ai.draft.creating")
									: strings("ai.draft.accept")}
							</button>
						</div>
					</div>
				))}
			</div>
		</>
	);

	const footer = drafts ? (
		<div className="flex justify-end gap-2">
			<button
				type="button"
				onClick={handleClose}
				disabled={creatingIdx !== null}
				className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{strings("common.close")}
			</button>
		</div>
	) : (
		<div className="flex justify-end gap-2">
			<button
				type="button"
				onClick={handleClose}
				disabled={submitting}
				className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{strings("common.cancel")}
			</button>
			<button
				type="button"
				onClick={handleSubmit}
				disabled={submitting || !hasInput}
				className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting && <i className="fa-solid fa-spinner fa-spin" aria-hidden />}
				{submitting ? strings("ai.draft.submitting") : strings("ai.draft.submit")}
			</button>
		</div>
	);

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={
				drafts
					? strings("ai.draft.review.title")
					: strings("ai.draft.modal.title")
			}
			maxWidth="4xl"
			footer={footer}
		>
			{drafts ? reviewView : inputView}
		</Modal>
	);
};

export default AiDraftModal;
