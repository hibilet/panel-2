import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "../../context";
import {
	deleteHotSwapToken,
	getHotSwapToken,
	setToken,
} from "../../lib/storage";
import strings from "../../localization";

const navItems = [
	{
		path: "/live",
		labelKey: "nav.live",
		icon: "fa-bolt",
		tourId: "nav-live",
		acl: ["merchant", "admin"],
		liveOnly: true,
	},
	{
		path: "/",
		labelKey: "nav.dashboard",
		icon: "fa-gauge-high",
		tourId: "nav-dashboard",
		acl: ["merchant", "admin"],
	},
	{
		path: "/accounts",
		labelKey: "nav.accounts",
		icon: "fa-users",
		acl: ["admin"],
	},
	{
		path: "/sales",
		labelKey: "nav.sales",
		icon: "fa-cart-shopping",
		tourId: "nav-sales",
		acl: ["merchant", "admin"],
	},
	{
		path: "/links",
		labelKey: "nav.links",
		icon: "fa-link",
		tourId: "nav-links",
		acl: ["merchant", "admin"],
	},
	{
		path: "/transactions",
		labelKey: "nav.transactions",
		icon: "fa-receipt",
		tourId: "nav-transactions",
		acl: ["merchant", "admin"],
	},
	{
		path: "/reports",
		labelKey: "nav.reports",
		icon: "fa-chart-line",
		tourId: "nav-reports",
		acl: ["merchant", "admin"],
	},
	{
		path: "/settings",
		labelKey: "nav.settings",
		icon: "fa-gear",
		tourId: "nav-settings",
		acl: ["merchant", "admin"],
	},
];

const Navbar = () => {
	const [location] = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const { account, sales } = useApp();
	const hotSwapToken = getHotSwapToken();

	const today = dayjs().format("YYYY-MM-DD");
	const hasEventsToday = useMemo(
		() =>
			(sales ?? []).some((s) => {
				const d = s.startDate ?? s.start;
				return d && dayjs(d).format("YYYY-MM-DD") === today;
			}),
		[sales, today],
	);

	const handleBackToAdmin = () => {
		const adminToken = getHotSwapToken();
		if (adminToken) {
			deleteHotSwapToken();
			setToken(adminToken);
		}
	};

	const activeItem = navItems.find(({ path }) =>
		path === "/" ? location === path : location.startsWith(path),
	);

	const NavLink = ({ path, label, icon, isActive, tourId, hasBeating }) => (
		<Link
			href={path}
			role="tab"
			aria-selected={isActive}
			aria-current={isActive ? "page" : undefined}
			data-tour={tourId}
			onClick={() => setMenuOpen(false)}
			className={`
        flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
        ${
					isActive
						? "bg-slate-900 text-white"
						: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
				}
      `}
		>
			<i
				className={`fa-solid ${icon} ${hasBeating ? "animate-heartbeat inline-block" : ""}`}
				aria-hidden
			/>
			<span>{label}</span>
		</Link>
	);

	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
			<div className="mx-auto max-w-5xl py-4 md:px-6 lg:px-0">
				<div className="flex items-center gap-3">
					{hotSwapToken && (
						<button
							type="button"
							onClick={handleBackToAdmin}
							className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
						>
							<i className="fa-solid fa-arrow-left" aria-hidden />
							{strings("nav.backToAdmin")}
						</button>
					)}
					<h1 className="text-xl font-semibold text-slate-900 dark:text-white">
						{account?.name
							? strings("app.welcome", [account.name])
							: strings("app.name")}
					</h1>
				</div>
				<nav aria-label="Main navigation" className="relative mt-4">
					<div className="hidden md:flex items-center gap-2" role="tablist">
						{navItems.map(({ path, labelKey, icon, tourId, acl, liveOnly }) => {
							if (liveOnly && !hasEventsToday) return null;
							const isActive =
								path === "/" ? location === path : location.startsWith(path);
							return acl.includes(account?.type?.split(".")[1]) ? (
								<NavLink
									key={path}
									path={path}
									label={strings(labelKey)}
									icon={icon}
									isActive={isActive}
									tourId={tourId}
									hasBeating={liveOnly && hasEventsToday}
								/>
							) : null;
						})}
					</div>

					{/* Mobile: dropdown */}
					<div className="md:hidden">
						<button
							type="button"
							onClick={() => setMenuOpen((o) => !o)}
							aria-expanded={menuOpen}
							aria-haspopup="true"
							aria-controls="nav-menu"
							id="nav-trigger"
							className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 shadow-sm"
						>
							<span className="flex items-center gap-2">
								<i
									className={`fa-solid ${activeItem?.icon ?? "fa-bars"}`}
									aria-hidden
								/>
								{activeItem
									? strings(activeItem.labelKey)
									: strings("nav.menu")}
							</span>
							<i
								className={`fa-solid fa-chevron-down transition-transform ${menuOpen ? "rotate-180" : ""}`}
								aria-hidden
							/>
						</button>
						<div
							id="nav-menu"
							role="menu"
							aria-labelledby="nav-trigger"
							className={`mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg transition-[max-height,opacity] duration-200 ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-0"}`}
						>
							<div className="py-2">
								{navItems.map(({ path, labelKey, icon, tourId, liveOnly }) => {
									if (liveOnly && !hasEventsToday) return null;
									const isActive =
										path === "/"
											? location === path
											: location.startsWith(path);
									return (
										<div key={path} className="px-2">
											<NavLink
												path={path}
												label={strings(labelKey)}
												icon={icon}
												isActive={isActive}
												tourId={tourId}
												hasBeating={liveOnly && hasEventsToday}
											/>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</nav>
			</div>
		</header>
	);
};

export default Navbar;
