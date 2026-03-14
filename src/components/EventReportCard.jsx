import { Link } from "wouter";
import strings from "../localization";
import ReadByChart from "./charts/ReadByChart";

const EventReportCard = ({ event }) => {
	const eventStart = event.start ?? event.startDate;
	const saleId = event.id ?? event._id;

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Link
						href={`/sales/${saleId}`}
						className="text-lg font-semibold text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 rounded"
					>
						{event.name ?? strings("common.untitled")}
					</Link>
					<p className="mt-1 text-sm text-slate-500">{event.venueName}</p>
					<dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
						<div className="flex gap-1.5">
							<dt className="text-slate-500">
								{strings("page.live.readerAccounts")}:
							</dt>
							<dd className="font-medium text-slate-900">{event.readerCount}</dd>
						</div>
						<div className="flex gap-1.5">
							<dt className="text-slate-500">
								{strings("page.live.attendeesRead")}:
							</dt>
							<dd className="font-medium text-slate-900">
								{strings("page.live.attendeesReadValue", [
									event.readCount,
									event.attendeesCount,
								])}
							</dd>
						</div>
					</dl>
				</div>
				<Link
					href={`/sales/${saleId}`}
					className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					{strings("common.viewAll")}
				</Link>
			</div>
			<div className="mt-6 h-48 w-full">
				<ReadByChart saleId={saleId} eventStart={eventStart} height={192} />
			</div>
		</div>
	);
};

export default EventReportCard;
