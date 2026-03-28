import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback, useRef, useState } from "react";
import { Textarea } from "../../../../components/inputs";
import {
	CircularProgress,
	Modal,
	StepConnector,
} from "../../../../components/shared";
import { useApp } from "../../../../context";
import { post } from "../../../../lib/client";
import strings from "../../../../localization";
import { runSaleProgrammeImport } from "../../../../routines/AISaleGeneration";
import { normalizeSaleProgramme } from "../../../../utils/hydrators";
import exampleResponse from "./sale.guided.response.json";

dayjs.extend(utc);

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const StepDisk = ({ label, done, total, active }) => {
	const safeTotal = Math.max(total, 1);
	const pct = Math.min(100, Math.round((done / safeTotal) * 100));
	return (
		<div
			className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 ${
				active
					? "border-slate-900 bg-slate-50 shadow-sm"
					: "border-slate-200 bg-white"
			}`}
		>
			<CircularProgress
				value={done}
				max={total || 1}
				size={52}
				aria-label={`${label} ${pct} percent`}
			>
				<span className="text-[10px] font-semibold text-slate-700">{pct}%</span>
			</CircularProgress>
			<span className="text-center text-xs font-medium text-slate-800">
				{label}
			</span>
			<span className="text-[11px] text-slate-500">
				{done}/{total}
			</span>
		</div>
	);
};

const ChatMessage = ({ message }) => {
	const isUser = message.role === "user";
	const isError = message.kind === "error";
	return (
		<div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
					isUser
						? "rounded-br-md bg-slate-900 text-white"
						: isError
							? "rounded-bl-md border border-red-200 bg-red-50 text-red-900"
							: "rounded-bl-md border border-slate-200/80 bg-white text-slate-800"
				}`}
			>
				{!isUser && (
					<div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600">
							<i className="fa-solid fa-robot text-[11px]" aria-hidden />
						</span>
						<span>Assistant</span>
					</div>
				)}
				{isUser && (
					<div className="mb-1 text-[11px] font-medium text-slate-300">You</div>
				)}
				<p className="whitespace-pre-wrap break-words">{message.text}</p>
				<time
					className={`mt-1.5 block text-[10px] tabular-nums ${
						isUser ? "text-slate-400" : "text-slate-400"
					}`}
				>
					{message.time}
				</time>
			</div>
		</div>
	);
};

const SaleGuidedForm = ({ onClose }) => {
	const { refreshSales } = useApp();
	const [description, setDescription] = useState(
		`Create event programme for 'Inna - City Name 2026' in march 15 Columbia Berlin, 17 Rotterdam, 19 Das Bett, 21 Mitsubishi Halle, and 22 Tivoli Vredenburg between 19.00 - 21.00. for every event we will have Early bird tickets at 59.90 eur, vip tickets at 149.90 eur and limited tickets at 74.90 eur. total event capacity is 1000, limited tickets stocks are 100. We will have campaigns in instagram.`,
	);
	const [generating, setGenerating] = useState(false);
	const [importing, setImporting] = useState(false);
	const [programme, setProgramme] = useState(null);
	const [error, setError] = useState(null);

	const [phase, setPhase] = useState(null);
	const [venuesDone, setVenuesDone] = useState(0);
	const [salesDone, setSalesDone] = useState(0);
	const [linksDone, setLinksDone] = useState(0);

	const [venuesTotal, setVenuesTotal] = useState(0);
	const [salesTotal, setSalesTotal] = useState(0);
	const [linksTotal, setLinksTotal] = useState(0);

	const [totalDone, setTotalDone] = useState(0);
	const [totalSteps, setTotalSteps] = useState(0);

	const [messages, setMessages] = useState([]);
	const logEndRef = useRef(null);

	const busy = generating || importing;
	const inputLocked = importing;

	const pushMessage = useCallback((text, kind = "info", role = "assistant") => {
		const entry = {
			id: nextId(),
			text,
			kind,
			role,
			time: dayjs().format("HH:mm"),
		};
		setMessages((prev) => {
			const next = [...prev, entry];
			requestAnimationFrame(() =>
				logEndRef.current?.scrollIntoView({ behavior: "smooth" }),
			);
			return next;
		});
	}, []);

	const resetProgress = () => {
		setPhase(null);
		setVenuesDone(0);
		setSalesDone(0);
		setLinksDone(0);
		setTotalDone(0);
		setMessages([]);
		setError(null);
	};

	const runImport = useCallback(
		async (data) => {
			setImporting(true);
			setError(null);
			try {
				await runSaleProgrammeImport(data, {
					refreshSales,
					onPhase: setPhase,
					onInitProgress: ({
						venuesTotal: vt,
						salesTotal: st,
						linksTotal: lt,
						grandTotal,
					}) => {
						setVenuesTotal(vt);
						setSalesTotal(st);
						setLinksTotal(lt);
						setTotalSteps(grandTotal);
						setTotalDone(0);
						setVenuesDone(0);
						setSalesDone(0);
						setLinksDone(0);
					},
					onVenueStep: () => {
						setVenuesDone((d) => d + 1);
						setTotalDone((d) => d + 1);
					},
					onSaleStep: () => {
						setSalesDone((d) => d + 1);
						setTotalDone((d) => d + 1);
					},
					onTicketStep: () => {
						setTotalDone((d) => d + 1);
					},
					onLinkStep: () => {
						setLinksDone((d) => d + 1);
						setTotalDone((d) => d + 1);
					},
					onLog: (text, kind) => pushMessage(text, kind ?? "info", "assistant"),
				});
			} catch (err) {
				const msg =
					err?.message ??
					err?.error ??
					(typeof err === "string" ? err : "Import failed");
				const errText = String(msg);
				setError(errText);
				pushMessage(errText, "error", "assistant");
				setPhase("error");
			} finally {
				setImporting(false);
			}
		},
		[pushMessage, refreshSales],
	);

	const handleGenerate = async () => {
		const brief = description.trim();
		setGenerating(true);
		setError(null);
		resetProgress();
		try {
			if (brief) {
				pushMessage(brief, "info", "user");
			}
			pushMessage("Generating programme from your brief…", "info", "assistant");
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
			setProgramme(normalized);
			pushMessage(
				`Programme ready: ${normalized.venues.length} venue(s), ${normalized.sales.length} event(s), ${normalized.links.length} link(s). Starting import…`,
				"info",
				"assistant",
			);
			await runImport(response);
		} catch (err) {
			const msg = err?.message ?? err?.error ?? "Something went wrong";
			const errText = typeof msg === "string" ? msg : "Request failed";
			setError(errText);
			pushMessage(errText, "error", "assistant");
		} finally {
			setGenerating(false);
		}
	};

	const handleLoadSample = () => {
		setError(null);
		resetProgress();
		const normalized = normalizeSaleProgramme(exampleResponse);
		setProgramme(normalized);
		pushMessage(
			"Using the built-in sample tour (fixture). Starting import…",
			"info",
			"assistant",
		);
		runImport(exampleResponse);
	};

	const safeTotal = Math.max(totalSteps, 1);
	const totalPct = Math.round((totalDone / safeTotal) * 100);

	const venuesArrowComplete =
		["events", "links", "done"].includes(phase ?? "") &&
		(venuesTotal === 0 || venuesDone >= venuesTotal);
	const eventsArrowComplete =
		["links", "done"].includes(phase ?? "") &&
		(salesTotal === 0 || salesDone >= salesTotal);

	return (
		<Modal
			isOpen
			onClose={onClose}
			title={strings("page.sale.guided.title")}
			maxWidth="6xl"
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
			<div className="flex min-h-[420px] flex-col gap-4">
				{(programme || totalSteps > 0) && (
					<div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
						<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
							Progress
						</p>
						<div className="flex flex-wrap items-start justify-center gap-0 sm:justify-start">
							<StepDisk
								label="Venues"
								done={venuesDone}
								total={venuesTotal}
								active={phase === "venues"}
							/>
							<StepConnector complete={venuesArrowComplete} />
							<StepDisk
								label="Events"
								done={salesDone}
								total={salesTotal}
								active={phase === "events"}
							/>
							<StepConnector complete={eventsArrowComplete} />
							<StepDisk
								label="Links"
								done={linksDone}
								total={linksTotal}
								active={phase === "links"}
							/>
						</div>
						<div className="space-y-1">
							<div className="flex justify-between text-xs text-slate-600">
								<span>Overall</span>
								<span>
									{totalDone}/{totalSteps || "—"}
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-slate-200">
								<div
									className="h-full rounded-full bg-slate-900 transition-all duration-300"
									style={{
										width: `${totalSteps ? totalPct : 0}%`,
									}}
								/>
							</div>
						</div>
					</div>
				)}

				<div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100/90 shadow-inner">
					<div className="border-b border-slate-200/80 bg-white/90 px-4 py-2">
						<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
							Conversation
						</p>
					</div>
					<div className="min-h-[200px] flex-1 space-y-4 overflow-y-auto px-4 py-4">
						{messages.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm text-slate-400">
								<i
									className="fa-regular fa-comments text-3xl text-slate-300"
									aria-hidden
								/>
								<p className="max-w-sm">
									Describe your tour below, then generate. Assistant updates
									will appear here.
								</p>
							</div>
						) : (
							messages.map((m) => <ChatMessage key={m.id} message={m} />)
						)}
						{(generating || importing) && (
							<div className="flex justify-start">
								<div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
									<span className="inline-flex items-center gap-2">
										<i className="fa-solid fa-spinner fa-spin" aria-hidden />
										{generating ? "Working…" : "Importing…"}
									</span>
								</div>
							</div>
						)}
						<div ref={logEndRef} />
					</div>

					<div className="border-t border-slate-200 bg-white p-4">
						<Textarea
							label="Your message"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder={strings("page.sale.guided.textareaPlaceholder")}
							rows={4}
							disabled={inputLocked}
							className="min-h-[100px] resize-y"
						/>
						{inputLocked && (
							<p className="mt-1.5 text-xs text-slate-500">
								Input is locked while the import runs step by step.
							</p>
						)}
					</div>
				</div>

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
