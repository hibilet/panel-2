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
		path: "/venues",
		labelKey: "nav.venues",
		icon: "fa-building",
		acl: ["merchant", "admin"],
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
		acl: ["admin"],
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

	const isMerchant = account?.type === "account.merchant";
	const isSetupComplete =
		!isMerchant ||
		(account?.providers !== false &&
			account?.agreements !== false &&
			account?.mailings !== false);

	const today = dayjs().format("YYYY-MM-DD");
	const isNavItemEnabled = (path) =>
		isSetupComplete || path === "/" || path === "/settings";

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

	const NavLink = ({
		path,
		label,
		icon,
		isActive,
		tourId,
		hasBeating,
		disabled,
	}) => {
		const baseClass = `
        flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
        ${
					disabled
						? "cursor-not-allowed opacity-50 text-slate-400"
						: isActive
							? "bg-slate-900 text-white"
							: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
				}
      `;
		if (disabled) {
			return (
				<span
					role="tab"
					aria-disabled="true"
					aria-selected={isActive}
					tabIndex={-1}
					data-tour={tourId}
					className={baseClass}
				>
					<i
						className={`fa-solid ${icon} ${hasBeating ? "animate-heartbeat inline-block" : ""}`}
						aria-hidden
					/>
					<span>{label}</span>
				</span>
			);
		}
		return (
			<Link
				href={path}
				role="tab"
				aria-selected={isActive}
				aria-current={isActive ? "page" : undefined}
				data-tour={tourId}
				onClick={() => setMenuOpen(false)}
				className={baseClass}
			>
				<i
					className={`fa-solid ${icon} ${hasBeating ? "animate-heartbeat inline-block" : ""}`}
					aria-hidden
				/>
				<span>{label}</span>
			</Link>
		);
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
			<div className="mx-auto max-w-5xl px-4 py-4 md:px-6 lg:px-0">
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
					{account?.realm?.name && (
						<span
							className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
							title={account.realm.name}
						>
							{account.realm.name}
						</span>
					)}
				</div>
				<nav aria-label="Main navigation" className="relative mt-4">
					<div className="hidden md:flex md:flex-nowrap md:overflow-x-auto md:scroll-smooth items-center gap-2" role="tablist">
						{navItems.map(({ path, labelKey, icon, tourId, acl, liveOnly }) => {
							if (liveOnly && !hasEventsToday) return null;
							const isActive =
								path === "/" ? location === path : location.startsWith(path);
							const disabled = !isNavItemEnabled(path);
							return acl.includes(account?.type?.split(".")[1]) ? (
								<NavLink
									key={path}
									path={path}
									label={strings(labelKey)}
									icon={icon}
									isActive={isActive}
									tourId={tourId}
									hasBeating={liveOnly && hasEventsToday}
									disabled={disabled}
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
							<div className="px-4 py-4">
								{navItems.map(({ path, labelKey, icon, tourId, acl, liveOnly }) => {
									if (liveOnly && !hasEventsToday) return null;
									if (!acl.includes(account?.type?.split(".")[1])) return null;
									const isActive =
										path === "/"
											? location === path
											: location.startsWith(path);
									const disabled = !isNavItemEnabled(path);
									return (
										<div key={path} className="px-2">
											<NavLink
												path={path}
												label={strings(labelKey)}
												icon={icon}
												isActive={isActive}
												tourId={tourId}
												hasBeating={liveOnly && hasEventsToday}
												disabled={disabled}
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
