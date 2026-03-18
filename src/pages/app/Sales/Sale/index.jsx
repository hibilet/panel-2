import { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";

import { get } from "../../../../lib/client";
import strings from "../../../../localization";
import SaleAttendees from "./SaleAttendees";
import SaleBasic from "./SaleBasic";
import SaleChannels from "./SaleChannels";
import SaleCoupons from "./SaleCoupons";
import SaleGuests from "./SaleGuests";
import SaleReaders from "./SaleReaders";
import SaleTickets from "./SaleTickets";

const tabItems = [
	{ path: "basic", labelKey: "page.sale.tab.basic", icon: "fa-file-lines" },
	{ path: "tickets", labelKey: "page.sale.tab.tickets", icon: "fa-ticket" },
	{ path: "channels", labelKey: "page.sale.tab.channels", icon: "fa-bullhorn" },
	{ path: "attendees", labelKey: "page.sale.tab.attendees", icon: "fa-users" },
	{ path: "guests", labelKey: "page.sale.tab.guests", icon: "fa-user-group" },
	{
		path: "readers",
		labelKey: "page.sale.tab.readers",
		icon: "fa-tablet-screen-button",
	},
	{ path: "coupons", labelKey: "page.sale.tab.coupons", icon: "fa-tag" },
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
	const [location] = useLocation();
	const [sale, setSale] = useState(undefined); // undefined=loading, null=new/error, object=loaded

	const basePath = `/sales/${id}`;
	const isNew = id === "new";

	const fetchSale = useCallback(() => {
		if (isNew) {
			setSale(null); // null = new form
			return;
		}
		setSale(undefined); // loading
		get(`/sales/${id}`)
			.then((r) => setSale(r.data ?? null))
			.catch(() => setSale(null));
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
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
			</div>

			<nav aria-label="Sale sections" className="mt-4">
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
					<Route path="/sales/:id/attendees" component={SaleAttendees} />
					<Route path="/sales/:id/guests" component={SaleGuests} />
					<Route path="/sales/:id/readers" component={SaleReaders} />
					<Route path="/sales/:id/coupons" component={SaleCoupons} />
				</Switch>
			</main>
		</div>
	);
};

export default Sale;
