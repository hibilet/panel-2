import dayjs from "dayjs";
import { useMemo, useState } from "react";
import strings from "../../localization";

const DAY_KEY = "YYYY-MM-DD";
const VISIBLE_PER_DAY = 3;

// Month grid over the visible 6 weeks. Events are bucketed onto every day they
// cover (start..end clamped to the grid) so a multi-day event reads as a band
// rather than a single dot on its first day.
const bucketByDay = (sales, gridStart, gridEnd) => {
	const map = new Map();
	for (const sale of sales ?? []) {
		const start = dayjs(sale.startDate ?? sale.start);
		if (!start.isValid()) continue;
		const rawEnd = sale.end ? dayjs(sale.end) : start;
		const end = rawEnd.isValid() && rawEnd.isAfter(start) ? rawEnd : start;

		let cursor = start.startOf("day");
		if (cursor.isBefore(gridStart)) cursor = gridStart;
		const last = end.startOf("day").isAfter(gridEnd)
			? gridEnd
			: end.startOf("day");

		while (!cursor.isAfter(last)) {
			const key = cursor.format(DAY_KEY);
			const bucket = map.get(key);
			const entry = { sale, isStart: cursor.isSame(start, "day") };
			if (bucket) bucket.push(entry);
			else map.set(key, [entry]);
			cursor = cursor.add(1, "day");
		}
	}
	return map;
};

const chipClass = (sale) => {
	const now = dayjs();
	const start = dayjs(sale.startDate ?? sale.start);
	const end = sale.end && dayjs(sale.end).isValid() ? dayjs(sale.end) : start;
	if (end.isBefore(now))
		return "bg-slate-100 text-slate-400 hover:bg-slate-200";
	if (start.isBefore(now))
		return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
	return "bg-slate-900/5 text-slate-700 hover:bg-slate-900/10";
};

const SalesCalendar = ({ sales = [], onSelect, loading = false }) => {
	const [month, setMonth] = useState(() => dayjs().startOf("month"));
	const [expandedDay, setExpandedDay] = useState(null);

	const gridStart = month.startOf("month").startOf("week");
	const gridEnd = gridStart.add(41, "day");

	const days = useMemo(
		() => Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day")),
		[gridStart],
	);

	const byDay = useMemo(
		() => bucketByDay(sales, gridStart, gridEnd),
		[sales, gridStart, gridEnd],
	);

	const goToMonth = (next) => {
		setExpandedDay(null);
		setMonth(next);
	};

	const today = dayjs();

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h2 className="text-lg font-semibold text-slate-900">
					{month.format("MMMM YYYY")}
				</h2>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => goToMonth(month.subtract(1, "month"))}
						aria-label={strings("common.previous")}
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
					>
						<i className="fa-solid fa-chevron-left" aria-hidden />
					</button>
					<button
						type="button"
						onClick={() => goToMonth(dayjs().startOf("month"))}
						className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
					>
						{strings("page.sales.today")}
					</button>
					<button
						type="button"
						onClick={() => goToMonth(month.add(1, "month"))}
						aria-label={strings("common.next")}
						className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
					>
						<i className="fa-solid fa-chevron-right" aria-hidden />
					</button>
				</div>
			</div>

			<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="min-w-[640px]">
					<div className="grid grid-cols-7 border-b border-slate-200">
						{days.slice(0, 7).map((d) => (
							<div
								key={d.format(DAY_KEY)}
								className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-slate-500"
							>
								{d.format("ddd")}
							</div>
						))}
					</div>
					<div className="grid grid-cols-7">
						{days.map((day) => {
							const key = day.format(DAY_KEY);
							const entries = byDay.get(key) ?? [];
							const isOpen = expandedDay === key;
							const shown = isOpen
								? entries
								: entries.slice(0, VISIBLE_PER_DAY);
							const hidden = entries.length - shown.length;
							const outside = !day.isSame(month, "month");
							const isToday = day.isSame(today, "day");
							return (
								<div
									key={key}
									className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 ${outside ? "bg-slate-50/60" : "bg-white"}`}
								>
									<div className="mb-1 flex justify-end">
										<span
											className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs ${
												isToday
													? "bg-slate-900 font-semibold text-white"
													: outside
														? "text-slate-400"
														: "text-slate-600"
											}`}
										>
											{day.date()}
										</span>
									</div>
									{loading ? (
										<div className="h-4 w-full animate-shimmer rounded" />
									) : (
										<div className="space-y-1">
											{shown.map(({ sale, isStart }) => (
												<button
													key={`${key}-${sale.id ?? sale.name}`}
													type="button"
													onClick={() => sale.id && onSelect?.(sale)}
													title={sale.name}
													className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs transition-colors ${chipClass(sale)}`}
												>
													{isStart && (
														<span className="mr-1 font-medium tabular-nums">
															{dayjs(sale.startDate ?? sale.start).format(
																"HH:mm",
															)}
														</span>
													)}
													{sale.name ?? "—"}
												</button>
											))}
											{hidden > 0 && (
												<button
													type="button"
													onClick={() => setExpandedDay(key)}
													className="block w-full rounded px-1.5 py-0.5 text-left text-xs font-medium text-slate-500 hover:text-slate-700"
												>
													{strings("page.sales.calendarMore", [hidden])}
												</button>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SalesCalendar;
