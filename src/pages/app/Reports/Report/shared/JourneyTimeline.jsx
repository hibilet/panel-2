import strings, { formatCurrency } from "../../../../../localization";
import { buildJourney, formatDuration } from "./churn-utils.js";

// `event.at` is already a dayjs from buildJourney() - format it directly.
// formatStamp is for raw extended-JSON inputs and would null out a dayjs.
const formatAt = (d) => (d?.isValid?.() ? d.format("D MMM YYYY, HH:mm") : "");

/**
 * Renders a chronological add-to-basket → abandon → return → buy timeline
 * for a single user. Replaces the old "Succeeded (151m 34s)" floating
 * note with an explicit "waited X" connector between events.
 */
const JourneyTimeline = ({ failedBaskets, successfulBaskets }) => {
	const events = buildJourney(failedBaskets, successfulBaskets);
	if (events.length === 0) {
		return (
			<p className="text-xs text-slate-500">
				{strings("page.reports.churn.journey.empty")}
			</p>
		);
	}
	return (
		<ol className="relative space-y-3">
			{events.map((e, i) => {
				const prev = i > 0 ? events[i - 1] : null;
				const waitSec = prev
					? Math.max(0, (e.at.valueOf() - prev.at.valueOf()) / 1000)
					: null;
				return (
					<li key={`${e.type}-${e.at.valueOf()}-${i}`}>
						{prev && (
							<div className="ml-3 flex items-center gap-2 py-1 text-xs text-slate-400">
								<span
									className="inline-block h-3 w-px bg-slate-200"
									aria-hidden
								/>
								<i className="fa-regular fa-hourglass-half" aria-hidden />
								<span>
									{strings("page.reports.churn.journey.waited", [
										formatDuration(waitSec),
									])}
								</span>
							</div>
						)}
						<JourneyEvent event={e} />
					</li>
				);
			})}
		</ol>
	);
};

const STATUS = {
	failed: {
		dot: "bg-red-500",
		label: "page.reports.churn.journey.lost",
		ring: "border-red-100 bg-red-50",
		title: "text-red-800",
	},
	succeeded: {
		dot: "bg-emerald-500",
		label: "page.reports.churn.journey.bought",
		ring: "border-emerald-100 bg-emerald-50",
		title: "text-emerald-800",
	},
};

const JourneyEvent = ({ event }) => {
	const cfg = STATUS[event.type];
	return (
		<div className={`rounded-lg border p-3 ${cfg.ring}`}>
			<div className="flex items-start gap-3">
				<span
					className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}
					aria-hidden
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<span className={`text-sm font-medium ${cfg.title}`}>
							{strings(cfg.label)}
						</span>
						<span className="text-xs text-slate-600">
							{formatAt(event.at)}
						</span>
					</div>
					{event.items?.parts?.length > 0 && (
						<p className="mt-1 text-sm text-slate-700">
							{event.items.parts.join(", ")}
							<span className="ml-2 text-slate-500">
								= {formatCurrency(event.items.total)}
							</span>
						</p>
					)}
					<div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
						{event.sale && (
							<span>
								<i className="fa-regular fa-calendar mr-1" aria-hidden />
								{event.sale}
							</span>
						)}
						{event.type === "failed" && (
							<span>
								<i className="fa-regular fa-clock mr-1" aria-hidden />
								{strings("page.reports.churn.journey.session", [
									formatDuration(event.sessionTimeSeconds),
								])}
							</span>
						)}
						{event.isUpsellCandidate && (
							<span className="rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-700">
								{strings("page.reports.churn.journey.upsellTag")}
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default JourneyTimeline;
