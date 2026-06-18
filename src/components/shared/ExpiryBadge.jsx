import dayjs from "dayjs";
import { dateStatus } from "../../lib/status";

// Date with a status affordance: red "Ended" once passed, amber "Ending soon"
// within warnDays, otherwise the plain date. Reusable for sale end, coupon
// expiry, ticket validity, stop-sale, etc.
const ExpiryBadge = ({ date, warnDays = 7, format = "D MMM YYYY", showDate = true }) => {
	if (!date) return <span className="text-slate-400">—</span>;
	const s = dateStatus(date, { warnDays });
	const formatted = dayjs(date).format(format);
	// Inline-flag mode (showDate=false) stays silent while still active.
	if (s.state === "ok") return showDate ? <span className="text-slate-700">{formatted}</span> : null;
	return (
		<span className="inline-flex items-center gap-1.5">
			{showDate && <span className={s.tone}>{formatted}</span>}
			<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.badge}`}>
				<i className={`fa-solid ${s.icon}`} aria-hidden />
				{s.label}
			</span>
		</span>
	);
};

export default ExpiryBadge;
