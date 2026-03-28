import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Textarea } from "../../../components/inputs";
import { CircularProgress, Modal } from "../../../components/shared";
import { useApp } from "../../../context";
import { post } from "../../../lib/client";
import strings from "../../../localization";
import {
	cloneImportCheckpoint,
	runSaleProgrammeImport,
} from "../../../routines/AISaleGeneration";
import { normalizeSaleProgramme } from "../../../utils/hydrators";
import exampleResponse from "./Sale/sale.guided.response.json";

dayjs.extend(utc);

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ChatBubble = ({ message, busy, onRetryImport }) => {
	const isUser = message.role === "user";
	const isError = message.kind === "error";
	const op = message.operation;
	const canRetryImport =
		isError && message.retry?.rawData && onRetryImport && !busy;

	return (
		<div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`w-fit max-w-[70%] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
					isUser
						? "rounded-br-md bg-slate-900 text-white"
						: isError
							? "rounded-bl-md border border-red-200 bg-red-50 text-red-900"
							: "rounded-bl-md border border-slate-200/90 bg-white text-slate-800"
				}`}
			>
				{!isUser && (
					<div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
						<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
							<i className="fa-solid fa-robot text-[11px]" aria-hidden />
						</span>
						<span>Assistant</span>
					</div>
				)}
				{isUser && (
					<div className="mb-1 text-[11px] font-medium text-slate-300">You</div>
				)}

				{message.text ? (
					<p className="whitespace-pre-wrap break-words">{message.text}</p>
				) : null}

				{canRetryImport ? (
					<button
						type="button"
						disabled={busy}
						onClick={() => onRetryImport(message.retry)}
						className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
					>
						<i className="fa-solid fa-rotate-right" aria-hidden />
						Continue import
					</button>
				) : null}

				{op ? (
					<div
						className={`${message.text ? "mt-3 border-t border-slate-100 pt-3" : ""} flex gap-3`}
					>
						<CircularProgress
							value={op.progress.value}
							max={op.progress.max}
							size={40}
							strokeWidth={4}
							aria-label={
								op.status === "done"
									? "Complete"
									: `Progress ${op.progress.max ? Math.round((op.progress.value / op.progress.max) * 100) : 0}%`
							}
						>
							{op.status === "done" ? (
								<i
									className="fa-solid fa-check text-[11px] text-emerald-600"
									aria-hidden
								/>
							) : (
								<span className="text-[9px] font-semibold text-slate-700">
									{op.progress.max
										? Math.min(
												100,
												Math.round((op.progress.value / op.progress.max) * 100),
											)
										: 0}
									%
								</span>
							)}
						</CircularProgress>
						<div className="min-w-0 flex-1 space-y-0.5">
							<p className="text-[13px] font-medium text-slate-900">
								{op.title}
							</p>
							{op.detail ? (
								<p
									className="truncate text-xs text-slate-600"
									title={op.detail}
								>
									{op.detail}
								</p>
							) : null}
							<p className="text-[11px] text-slate-500">{op.sublabel}</p>
							{op.status === "done" && op.links?.length > 0 ? (
								<div className="mt-2 flex flex-wrap gap-2">
									{op.links.map((l) => (
										<a
											key={l.href}
											href={l.href}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100"
										>
											{l.label}
											<i
												className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-70"
												aria-hidden
											/>
										</a>
									))}
								</div>
							) : null}
						</div>
					</div>
				) : null}

				<time className="mt-2 block text-[10px] tabular-nums text-slate-400">
					{message.time}
				</time>
			</div>
		</div>
	);
};

const SaleGuidedForm = ({ onClose }) => {
	const { refreshSales } = useApp();
	const [description, setDescription] = useState();
	const [generating, setGenerating] = useState(false);
	const [importing, setImporting] = useState(false);
	const [messages, setMessages] = useState([]);
	const [scrollVers, setScrollVers] = useState(0);
	const logEndRef = useRef(null);
	const importCheckpointRef = useRef(cloneImportCheckpoint(null));
	const lastImportRawRef = useRef(null);

	const bumpScroll = useCallback(() => {
		setScrollVers((v) => v + 1);
	}, []);

	const busy = generating || importing;
	const inputLocked = importing;

	const appendMessages = useCallback(
		(entries) => {
			setMessages((prev) => [...prev, ...entries]);
			bumpScroll();
		},
		[bumpScroll],
	);

	const pushTextMessage = useCallback(
		(text, kind = "info", role = "assistant") => {
			appendMessages([
				{
					id: nextId(),
					text,
					kind,
					role,
					time: dayjs().format("HH:mm"),
				},
			]);
		},
		[appendMessages],
	);

	const pushOperationMessage = useCallback(
		(operation) => {
			const id = nextId();
			appendMessages([
				{
					id,
					text: null,
					kind: "info",
					role: "assistant",
					time: dayjs().format("HH:mm"),
					operation,
				},
			]);
			return id;
		},
		[appendMessages],
	);

	const patchOperation = useCallback(
		(msgId, partialOp) => {
			setMessages((prev) =>
				prev.map((m) => {
					if (m.id !== msgId || !m.operation) return m;
					return {
						...m,
						operation: {
							...m.operation,
							...partialOp,
							progress: partialOp.progress
								? { ...m.operation.progress, ...partialOp.progress }
								: m.operation.progress,
							links: partialOp.links ?? m.operation.links,
						},
					};
				}),
			);
			bumpScroll();
		},
		[bumpScroll],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: run when chat updates or activity indicator toggles
	useLayoutEffect(() => {
		logEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [scrollVers, generating, importing]);

	const resetSession = () => {
		setMessages([]);
		importCheckpointRef.current = cloneImportCheckpoint(null);
		lastImportRawRef.current = null;
		bumpScroll();
	};

	const runImport = useCallback(
		async (data, resume = null) => {
			setImporting(true);
			if (!resume) {
				importCheckpointRef.current = cloneImportCheckpoint(null);
			}
			lastImportRawRef.current = data;
			try {
				await runSaleProgrammeImport(data, {
					resume: resume ?? undefined,
					refreshSales,
					onCheckpoint: (cp) => {
						importCheckpointRef.current = cloneImportCheckpoint(cp);
					},
					ui: {
						onLog: (text, kind) => pushTextMessage(text, kind ?? "info"),
						venueStart: (name) =>
							pushOperationMessage({
								entity: "venue",
								title: "Creating venue",
								detail: name,
								sublabel: "Saving…",
								progress: { value: 0, max: 1 },
								status: "running",
								links: [],
							}),
						venueDone: (msgId, { id }) => {
							patchOperation(msgId, {
								sublabel: "Done",
								status: "done",
								progress: { value: 1, max: 1 },
								links: [{ label: "Open venue", href: `/venues/${id}` }],
							});
						},
						eventStart: (name, max) =>
							pushOperationMessage({
								entity: "event",
								title: "Creating event",
								detail: name,
								sublabel: "Starting…",
								progress: { value: 0, max },
								status: "running",
								links: [],
							}),
						eventProgress: (msgId, { value, max, sublabel }) => {
							patchOperation(msgId, {
								sublabel,
								progress: { value, max },
							});
						},
						eventDone: (msgId, { id, max }) => {
							patchOperation(msgId, {
								sublabel: "Done",
								status: "done",
								progress: { value: max, max },
								links: [{ label: "Open event", href: `/sales/${id}` }],
							});
						},
						linkStart: (name) =>
							pushOperationMessage({
								entity: "link",
								title: "Creating link",
								detail: name,
								sublabel: "Saving…",
								progress: { value: 0, max: 1 },
								status: "running",
								links: [],
							}),
						linkDone: (msgId, { id }) => {
							patchOperation(msgId, {
								sublabel: "Done",
								status: "done",
								progress: { value: 1, max: 1 },
								links: [{ label: "Open link", href: `/links/${id}` }],
							});
						},
					},
				});
				importCheckpointRef.current = cloneImportCheckpoint(null);
			} catch (err) {
				const msg =
					err?.message ??
					err?.error ??
					(typeof err === "string" ? err : "Import failed");
				const errText = String(msg);
				const raw = lastImportRawRef.current;
				const snap = cloneImportCheckpoint(importCheckpointRef.current);
				appendMessages([
					{
						id: nextId(),
						text: errText,
						kind: "error",
						role: "assistant",
						time: dayjs().format("HH:mm"),
						retry: raw ? { rawData: raw, checkpoint: snap } : undefined,
					},
				]);
			} finally {
				setImporting(false);
			}
		},
		[
			appendMessages,
			patchOperation,
			pushOperationMessage,
			pushTextMessage,
			refreshSales,
		],
	);

	const handleRetryImport = useCallback(
		(retry) => {
			if (!retry?.rawData) return;
			runImport(retry.rawData, cloneImportCheckpoint(retry.checkpoint));
		},
		[runImport],
	);

	const handleGenerate = async () => {
		const brief = description.trim();
		setGenerating(true);
		resetSession();
		try {
			if (brief) {
				pushTextMessage(brief, "info", "user");
			}
			pushTextMessage("Generating programme from your brief…");
			const response = await post("/ai/sales", { message: brief });
			const normalized = normalizeSaleProgramme(response);
			if (
				!normalized.venues.length &&
				!normalized.sales.length &&
				!normalized.links.length
			) {
				throw new Error(
					"AI returned an empty programme. Try adjusting the brief.",
				);
			}
			const linkSummary =
				normalized.sales.length <= 1
					? "no tour link (single event)"
					: `${normalized.links.length} link(s)`;
			pushTextMessage(
				`Programme ready: ${normalized.venues.length} venue(s), ${normalized.sales.length} event(s), ${linkSummary}. Starting import…`,
			);
			await runImport(response, null);
		} catch (err) {
			const msg = err?.message ?? err?.error ?? "Something went wrong";
			const errText = typeof msg === "string" ? msg : "Request failed";
			pushTextMessage(errText, "error");
		} finally {
			setGenerating(false);
		}
	};

	const handleLoadSample = () => {
		resetSession();
		pushTextMessage(
			"Using the built-in sample tour (fixture). Starting import…",
		);
		runImport(exampleResponse, null);
	};

	return (
		<Modal
			isOpen
			onClose={onClose}
			title={strings("page.sale.guided.title")}
			maxWidth="6xl"
			panelMinHeight="min-h-[90vh]"
			// panelMaxHeight="max-h-[96vh]"
			bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-6"
			footer={
				<div className="flex w-full flex-wrap items-center justify-end gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={handleLoadSample}
						className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
					>
						Load sample &amp; import
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={handleGenerate}
						className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
					>
						{busy ? (
							<>
								<i className="fa-solid fa-spinner fa-spin" aria-hidden />
								{generating
									? strings("page.sale.guided.generating")
									: "Importing…"}
							</>
						) : (
							<>
								<i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
								{strings("page.sale.guided.generate")}
							</>
						)}
					</button>
				</div>
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3">
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100/90 shadow-inner min-h-[min(68vh,52rem)]">
					<div className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-2.5">
						<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
							Assistant chat
						</p>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
						<div className="flex min-h-full flex-col space-y-4">
							{messages.length === 0 ? (
								<div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
									<span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
										<i
											className="fa-solid fa-comments text-2xl text-slate-300"
											aria-hidden
										/>
									</span>
									<p className="max-w-sm leading-relaxed">
										Describe your programme below. Progress for each venue,
										event, and link appears here. If something fails, use
										Continue import to pick up where you left off.
									</p>
								</div>
							) : (
								messages.map((m) => (
									<ChatBubble
										key={m.id}
										message={m}
										busy={busy}
										onRetryImport={handleRetryImport}
									/>
								))
							)}
							{(generating || importing) && (
								<div className="flex w-full justify-start">
									<div className="w-fit max-w-[70%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
										<span className="inline-flex items-center gap-2">
											<i className="fa-solid fa-spinner fa-spin" aria-hidden />
											{generating ? "Thinking…" : "Working…"}
										</span>
									</div>
								</div>
							)}
							<div ref={logEndRef} className="h-px shrink-0" aria-hidden />
						</div>
					</div>

					<div className="shrink-0 border-t border-slate-200 bg-white p-4">
						<Textarea
							label="Message"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={strings("page.sale.guided.textareaPlaceholder")}
							rows={4}
							disabled={inputLocked}
							className="min-h-[96px] resize-y"
						/>
						{inputLocked ? (
							<p className="mt-1.5 text-xs text-slate-500">
								Message field is locked while import runs.
							</p>
						) : null}
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default SaleGuidedForm;
