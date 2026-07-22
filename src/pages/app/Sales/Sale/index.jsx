import { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation, useParams, useSearch } from "wouter";

import { useApp } from "../../../../context";
import { API_BASE_URL, get } from "../../../../lib/client";
import { getToken } from "../../../../lib/storage";
import { showToast } from "../../../../lib/toastStore";
import strings from "../../../../localization";
import SaleAttendees from "./SaleAttendees";
import SaleBasic from "./SaleBasic";
import SaleChannels from "./SaleChannels";
import SaleCoupons from "./SaleCoupons";
import SaleGuests from "./SaleGuests";
import SaleGuidedForm from "./SaleGuidedForm";
import SaleQuestions from "./SaleQuestions";
import SaleReaders from "./SaleReaders";
import SaleReport from "./SaleReport";
import SaleTickets from "./SaleTickets";

const tabItems = [
	{ path: "basic", labelKey: "page.sale.tab.basic", icon: "fa-file-lines" },
	{ path: "tickets", labelKey: "page.sale.tab.tickets", icon: "fa-ticket" },
	{ path: "channels", labelKey: "page.sale.tab.channels", icon: "fa-bullhorn" },
	{ path: "questions", labelKey: "page.sale.tab.questions", icon: "fa-question-circle" },
	{ path: "attendees", labelKey: "page.sale.tab.attendees", icon: "fa-users" },
	{ path: "guests", labelKey: "page.sale.tab.guests", icon: "fa-user-group" },
	{
		path: "readers",
		labelKey: "page.sale.tab.readers",
		icon: "fa-tablet-screen-button",
	},
	{ path: "coupons", labelKey: "page.sale.tab.coupons", icon: "fa-tag" },
	{ path: "report", labelKey: "page.sale.tab.report", icon: "fa-chart-pie" },
];

const TabLink = ({ path, labelKey, icon, isActive, basePath, disabled }) => {
	const baseClassName = `
      flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium
      transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
      ${
				isActive
					? "bg-slate-900 text-white"
					: disabled
						? "cursor-not-allowed text-slate-400"
						: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
			}
    `;
	if (disabled) {
		return (
			<button
				type="button"
				disabled
				role="tab"
				aria-disabled="true"
				aria-selected={isActive}
				className={baseClassName}
			>
				<i className={`fa-solid ${icon}`} aria-hidden />
				<span>{strings(labelKey)}</span>
			</button>
		);
	}
	return (
		<Link
			href={path === "basic" ? basePath : `${basePath}/${path}`}
			role="tab"
			aria-selected={isActive}
			aria-current={isActive ? "page" : undefined}
			className={baseClassName}
		>
			<i className={`fa-solid ${icon}`} aria-hidden />
			<span>{strings(labelKey)}</span>
		</Link>
	);
};

const Sale = () => {
	const { id } = useParams();
	const [location, setLocation] = useLocation();
	const search = useSearch();
	const { account } = useApp();
	const [sale, setSale] = useState(undefined); // undefined=loading, null=new, object=loaded
	const [loadError, setLoadError] = useState(null);

	const basePath = `/sales/${id}`;
	const isNew = id === "new";
	const isGuided = new URLSearchParams(search || "").get("guided") === "true";
	const [reporting, setReporting] = useState(false);

	// Live settlement PDF. Authed binary stream, so fetch as a blob and trigger
	// a browser download rather than going through the JSON client.
	const downloadReport = async () => {
		setReporting(true);
		try {
			const res = await fetch(`${API_BASE_URL}/sales/${id}/report.pdf`, {
				headers: { authorization: getToken() },
			});
			if (!res.ok) throw new Error("report-failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `report-${(sale?.name || "event").replace(/[^\w.-]+/g, "_")}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch {
			showToast("error", strings("page.sale.report.failed"));
		} finally {
			setReporting(false);
		}
	};

	// Sales are merchant-owned. Admins reviewing existing sales is fine,
	// but creating new ones is out of scope - bounce them back to the list.
	useEffect(() => {
		if (isNew && account?.type === "account.admin") {
			setLocation("/sales", true);
		}
	}, [isNew, account?.type, setLocation]);

	const handleCloseGuided = () => {
		setLocation("/sales/new", true);
	};

	// A failed load must NOT fall through to `null` - that is the "new sale"
	// sentinel, and rendering the blank create form over an existing event
	// invites the user to overwrite it with empty values.
	const fetchSale = useCallback(() => {
		setLoadError(null);
		if (isNew) {
			setSale(null); // null = new form
			return;
		}
		setSale(undefined); // loading
		get(`/sales/${id}`)
			.then((r) => setSale(r.data ?? null))
			.catch((err) => setLoadError(err?.message ?? "load-failed"));
	}, [id, isNew]);

	useEffect(() => {
		fetchSale();
	}, [fetchSale]);

	const isTabActive = (path) => {
		if (path === "basic")
			return location === basePath || location === `${basePath}/`;
		return location.startsWith(`${basePath}/${path}`);
	};

	const title = isNew
		? strings("page.sale.new")
		: (sale?.name ?? strings("page.sale.title"));

	return (
		<div className="mx-auto max-w-5xl">
			{isNew && isGuided && <SaleGuidedForm onClose={handleCloseGuided} />}
			<Link
				href="/sales"
				className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("back.sales")}
			</Link>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
				{!isNew && sale && (
					<button
						type="button"
						onClick={downloadReport}
						disabled={reporting}
						className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
					>
						<i className={`fa-solid ${reporting ? "fa-spinner fa-spin" : "fa-file-pdf"}`} aria-hidden />
						{strings("page.sale.report.button")}
					</button>
				)}
			</div>

			{loadError && (
				<div
					className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
					role="alert"
				>
					<span>{strings("page.sale.loadFailed")}</span>
					<button
						type="button"
						onClick={fetchSale}
						className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
					>
						{strings("error.reload")}
					</button>
				</div>
			)}

			{!loadError && (
			<>
			<nav aria-label={strings("page.sale.sections")} className="mt-4">
				<div className="flex flex-wrap gap-2" role="tablist">
					{tabItems.map(({ path, labelKey, icon }) => (
						<TabLink
							key={path}
							path={path}
							labelKey={labelKey}
							icon={icon}
							isActive={isTabActive(path)}
							basePath={basePath}
							disabled={isNew && path !== "basic"}
						/>
					))}
				</div>
			</nav>
			<main className="mt-6">
				<Switch>
					<Route
						path="/sales/:id/basic"
						component={(props) => (
							<SaleBasic {...props} sale={sale} setSale={setSale} />
						)}
					/>
					<Route
						path="/sales/:id"
						component={(props) => (
							<SaleBasic {...props} sale={sale} setSale={setSale} />
						)}
					/>
					<Route
						path="/sales/:id/tickets"
						component={(props) => (
							<SaleTickets {...props} sale={sale} setSale={setSale} />
						)}
					/>
					<Route path="/sales/:id/channels" component={SaleChannels} />
					<Route
						path="/sales/:id/questions"
						component={(props) => (
							<SaleQuestions {...props} sale={sale} setSale={setSale} />
						)}
					/>
					<Route
						path="/sales/:id/attendees"
						component={(props) => (
							<SaleAttendees {...props} sale={sale} />
						)}
					/>
					<Route path="/sales/:id/guests" component={SaleGuests} />
					<Route path="/sales/:id/readers" component={SaleReaders} />
					<Route path="/sales/:id/coupons" component={SaleCoupons} />
					<Route path="/sales/:id/report" component={SaleReport} />
				</Switch>
			</main>
			</>
			)}
		</div>
	);
};

export default Sale;
