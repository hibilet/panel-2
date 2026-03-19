import ChurnReport from "./ChurnReport";
import EventReport from "./EventReport";

const REPORT_COMPONENTS = {
	event: EventReport,
	churn: ChurnReport,
};

const Report = () => {
	const type = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("type") ?? "event";
	const Component = REPORT_COMPONENTS[type] ?? EventReport;

	return <Component />;
};

export default Report;
