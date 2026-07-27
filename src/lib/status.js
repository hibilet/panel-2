import dayjs from "dayjs";
import strings from "../localization";

// Shared expiry/deadline status for any date (sale end, coupon expiry, ticket
// validity, stop-sale...). Drives the warning/danger affordances across the UI.
//   passed  -> red danger (already ended/expired)
//   soon    -> yellow warning (within `warnDays`)
//   ok      -> neutral
//   none    -> no date
export const dateStatus = (date, { warnDays = 7 } = {}) => {
	if (!date) return { state: "none" };
	const d = dayjs(date);
	const now = dayjs();
	if (d.isBefore(now)) {
		return {
			state: "passed",
			tone: "text-red-700",
			bg: "bg-red-50",
			border: "border-red-300",
			badge: "bg-red-100 text-red-700",
			icon: "fa-circle-exclamation",
			label: strings("status.ended"),
		};
	}
	if (d.diff(now, "day") <= warnDays) {
		return {
			state: "soon",
			tone: "text-amber-700",
			bg: "bg-amber-50",
			border: "border-amber-300",
			badge: "bg-amber-100 text-amber-800",
			icon: "fa-triangle-exclamation",
			label: strings("status.endingSoon"),
		};
	}
	return {
		state: "ok",
		tone: "text-slate-700",
		bg: "",
		border: "border-slate-200",
		badge: "bg-slate-100 text-slate-600",
		icon: "",
		label: strings("status.active"),
	};
};

// Tailwind border class for wrapping a card/row in the status color.
export const statusBorder = (date, opts) => dateStatus(date, opts).border ?? "border-slate-200";
