import { useEffect, useState } from "react";
import { get, post } from "../../../../lib/client";
import strings from "../../../../localization";

// Ticket-email deliverability. Surfaces buyers who paid but were not emailed
// their tickets (undelivered), plus failed/exhausted SMTP attempts that would
// otherwise be a silent drop. One-click resend per row.
const Tile = ({ label, value, danger }) => (
	<div
		className={`rounded-lg border p-4 ${
			danger && value > 0
				? "border-red-200 bg-red-50"
				: "border-slate-200 bg-slate-50"
		}`}
	>
		<div
			className={`text-2xl font-semibold ${
				danger && value > 0 ? "text-red-600" : "text-slate-900"
			}`}
		>
			{value}
		</div>
		<div className="text-xs text-slate-500">{label}</div>
	</div>
);

const MailHealth = () => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [resending, setResending] = useState(null);

	const load = () => {
		setLoading(true);
		get("/mailing/health")
			.then((res) => setData(res.data))
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	};

	useEffect(load, []);

	const resend = (transaction) => {
		setResending(transaction);
		post("/mailing/resend", { transaction })
			.then(() => load())
			.catch(() => {})
			.finally(() => setResending(null));
	};

	if (loading || !data) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<p className="text-sm text-slate-500">{strings("page.mailHealth.loading")}</p>
			</div>
		);
	}

	const recent = data.recent ?? [];

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
				<i className="fa-solid fa-heart-pulse text-slate-600" aria-hidden />
				{strings("page.mailHealth.title")}
			</h2>
			<p className="mb-4 text-sm text-slate-500">
				{strings("page.mailHealth.subtitle")}
			</p>

			<div className="mb-4 grid grid-cols-3 gap-3">
				<Tile label={strings("page.mailHealth.notEmailed")} value={data.undelivered ?? 0} danger />
				<Tile label={strings("page.mailHealth.failed")} value={data.failed ?? 0} />
				<Tile label={strings("page.mailHealth.exhausted")} value={data.exhausted ?? 0} danger />
			</div>

			{recent.length === 0 ? (
				<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
					{strings("page.mailHealth.allDelivered")}
				</p>
			) : (
				<ul className="divide-y divide-slate-100">
					{recent.map((r) => (
						<li
							key={r._id}
							className="flex items-center justify-between gap-3 py-2"
						>
							<div className="min-w-0">
								<div className="truncate text-sm font-medium text-slate-800">
									{r.email || "—"}
								</div>
								<div className="truncate text-xs text-slate-500">
									{r.sale || "—"}
								</div>
							</div>
							<button
								type="button"
								onClick={() => resend(r._id)}
								disabled={resending === r._id}
								className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
							>
								{strings(resending === r._id ? "page.mailHealth.sending" : "page.mailHealth.resend")}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default MailHealth;
