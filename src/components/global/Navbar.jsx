import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp, useNotifications } from "../../context";
import {
	can,
	familyEnabled,
	isSuperadmin,
	quota,
} from "../../lib/capabilities";
import { resolveNotificationLink } from "../../lib/notifications";
import {
	clearTokenStack,
	getTokenStack,
	popToken,
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
		panelCap: "panel.dashboard",
	},
	{
		path: "/dashboard",
		labelKey: "nav.dashboard",
		icon: "fa-gauge-high",
		acl: ["admin"],
		superadminOnly: true,
	},
	{
		path: "/accounts",
		labelKey: "nav.accounts",
		icon: "fa-users",
		acl: ["admin"],
		panelCap: "panel.accounts",
		group: "admin",
	},
	{
		path: "/venues",
		labelKey: "nav.venues",
		icon: "fa-building",
		acl: ["merchant", "admin"],
		panelCap: "panel.venues",
	},
	{
		path: "/sales",
		labelKey: "nav.sales",
		icon: "fa-cart-shopping",
		tourId: "nav-sales",
		acl: ["merchant", "admin"],
		panelCap: "panel.sales",
	},
	{
		path: "/links",
		labelKey: "nav.links",
		icon: "fa-link",
		tourId: "nav-links",
		acl: ["merchant", "admin"],
		panelCap: "panel.links",
		cap: { key: "links", min: 1 },
	},
	{
		path: "/transactions",
		labelKey: "nav.transactions",
		icon: "fa-receipt",
		tourId: "nav-transactions",
		acl: ["merchant", "admin"],
		panelCap: "panel.transactions",
	},
	{
		path: "/reports",
		labelKey: "nav.reports",
		icon: "fa-chart-line",
		tourId: "nav-reports",
		acl: ["merchant", "admin"],
		panelCap: "panel.reports",
		cap: { family: "reporting" },
	},
	{
		path: "/analytics",
		labelKey: "nav.analytics",
		icon: "fa-chart-pie",
		acl: ["merchant", "admin"],
		panelCap: "panel.analytics",
	},
	{
		path: "/tiers",
		labelKey: "nav.tiers",
		icon: "fa-layer-group",
		acl: ["admin"],
		group: "admin",
	},
	{
		path: "/invoices",
		labelKey: "nav.invoices",
		icon: "fa-file-invoice-dollar",
		acl: ["merchant", "admin"],
		panelCap: "panel.invoices",
	},
	{
		path: "/events",
		labelKey: "nav.events",
		icon: "fa-clipboard-list",
		acl: ["admin"],
		group: "admin",
		superadminOnly: true,
	},
	{
		path: "/jobs",
		labelKey: "nav.jobs",
		icon: "fa-clock-rotate-left",
		acl: ["admin"],
		group: "admin",
	},
	{
		path: "/realms",
		labelKey: "nav.realms",
		icon: "fa-layer-group",
		acl: ["admin"],
		group: "admin",
		superadminOnly: true,
	},
	{
		path: "/platform",
		labelKey: "nav.platform",
		icon: "fa-tower-broadcast",
		acl: ["admin"],
		group: "admin",
		superadminOnly: true,
	},
	{
		path: "/settings",
		labelKey: "nav.settings",
		icon: "fa-gear",
		tourId: "nav-settings",
		acl: ["merchant", "admin"],
		panelCap: "panel.settings",
	},
];

const severityDot = {
	info: "bg-blue-500",
	success: "bg-emerald-500",
	warning: "bg-amber-500",
	error: "bg-red-500",
};

const formatRelative = (iso) => {
	if (!iso) return "";
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h`;
	const days = Math.floor(hrs / 24);
	if (days < 7) return `${days}d`;
	return dayjs(iso).format("D MMM");
};

const NotificationsBell = () => {
	const [, setLocation] = useLocation();
	const { items, unreadCount, markRead, markAllRead } = useNotifications();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		const onClick = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		window.addEventListener("click", onClick);
		return () => window.removeEventListener("click", onClick);
	}, []);

	const recent = (items ?? []).slice(0, 8);

	const handleItemClick = (n) => {
		if (!n.readAt) markRead(n.id);
		setOpen(false);
		const link = resolveNotificationLink(n);
		if (link) {
			if (link.startsWith("http")) {
				window.open(link, "_blank", "noopener");
			} else {
				setLocation(link);
			}
		}
	};

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label={strings("page.notifications.bellAria")}
				aria-expanded={open}
				className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
			>
				<i className="fa-solid fa-bell" aria-hidden />
				{unreadCount > 0 && (
					<span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				)}
			</button>
			{open && (
				<div className="absolute right-0 z-[60] mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
					<div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
						<span className="text-sm font-semibold text-slate-900">
							{strings("page.notifications.dropdownTitle")}
						</span>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								markAllRead();
							}}
							disabled={unreadCount === 0}
							className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
						>
							{strings("page.notifications.markAllRead")}
						</button>
					</div>
					<div className="max-h-80 overflow-y-auto">
						{recent.length === 0 ? (
							<div className="px-4 py-6 text-center text-sm text-slate-500">
								{strings("page.notifications.empty")}
							</div>
						) : (
							recent.map((n) => (
								<button
									key={n.id}
									type="button"
									onClick={() => handleItemClick(n)}
									className={`flex w-full items-start gap-2 border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50 ${
										n.readAt ? "" : "bg-blue-50/40"
									}`}
								>
									<span
										className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
											severityDot[n.severity] ?? "bg-slate-400"
										}`}
										aria-hidden
									/>
									<span className="min-w-0 flex-1">
										<span className="flex items-center justify-between gap-2">
											<span
												className={`truncate font-medium ${
													n.readAt ? "text-slate-700" : "text-slate-900"
												}`}
											>
												{n.title ?? n.type}
											</span>
											<span className="shrink-0 text-xs text-slate-400">
												{formatRelative(n.createdAt)}
											</span>
										</span>
										{n.body && (
											<span className="mt-0.5 block truncate text-xs text-slate-500">
												{n.body}
											</span>
										)}
									</span>
								</button>
							))
						)}
					</div>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							setLocation("/notifications");
						}}
						className="block w-full border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-100"
					>
						{strings("page.notifications.viewAll")}
					</button>
				</div>
			)}
		</div>
	);
};

// Module scope on purpose: defined inside Navbar it was a fresh component type
// on every render, so React remounted every nav item (and dropped focus) each
// time the menu opened or the route changed.
const NavLink = ({
	path,
	label,
	icon,
	isActive,
	tourId,
	hasBeating,
	disabled,
	onNavigate,
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
				aria-disabled="true"
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
			aria-current={isActive ? "page" : undefined}
			data-tour={tourId}
			onClick={onNavigate}
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

const Navbar = () => {
	const [location] = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const { account, sales } = useApp();
	const tokenStack = getTokenStack();
	const previous = tokenStack[tokenStack.length - 1];

	const isMerchant = account?.type === "account.merchant";
	const isSetupComplete =
		!isMerchant ||
		(account?.providers !== false &&
			account?.agreements !== false &&
			account?.mailings !== false);

	const today = dayjs().format("YYYY-MM-DD");
	const isNavItemEnabled = (path) =>
		isSetupComplete || path === "/" || path === "/settings";

	// Capability gate.
	//
	// Only SUPERADMINS bypass it. This used to exempt every admin, which no
	// longer works: realm staff (finance, sales) are admins too, so a blanket
	// admin bypass would defeat every panel.* restriction placed on them.
	//
	// Plan capabilities (links, reporting, ...) still don't apply to admins -
	// those describe what a merchant bought, not what an operator may see - so
	// admins skip that half while remaining subject to panel.* gates.
	const passesCapGate = (cap) => {
		if (!cap) return true;
		if (isSuperadmin(account)) return true;
		const isPanelGate = cap.key?.startsWith("panel.") || cap.family === "panel";
		if (!isPanelGate && account?.type === "account.admin") return true;
		if (cap.family) return familyEnabled(account, cap.family);
		if (cap.key && typeof cap.min === "number")
			return quota(account, cap.key) >= cap.min;
		if (cap.key) return can(account, cap.key);
		return true;
	};

	const hasEventsToday = useMemo(
		() =>
			(sales ?? []).some((s) => {
				const d = s.startDate ?? s.start;
				return d && dayjs(d).format("YYYY-MM-DD") === today;
			}),
		[sales, today],
	);

	// One visibility rule for every rendering of the nav. The bar, the
	// administration menu and the mobile list all ask this, so they cannot
	// drift apart.
	const navVisible = (item) => {
		if (item.liveOnly && !hasEventsToday) return false;
		if (item.superadminOnly && !isSuperadmin(account)) return false;
		if (!passesCapGate(item.cap)) return false;
		if (item.panelCap && !can(account, item.panelCap) && !isSuperadmin(account))
			return false;
		return item.acl.includes(account?.type?.split(".")[1]);
	};

	// One flat bar. Admin items used to live behind an "Administration"
	// dropdown, which hid the platform surface well enough that it read as not
	// existing at all. A superadmin gets the launcher at / for the full map, so
	// the bar no longer has to carry that weight.
	// "/" is the launcher for a superadmin and the dashboard for everyone else,
	// so the first item is relabelled rather than duplicated.
	const barItems = navItems
		.filter(navVisible)
		.map((i) =>
			i.path === "/" && isSuperadmin(account)
				? { ...i, labelKey: "home.nav", icon: "fa-shield-halved" }
				: i,
		);

	// One step up the impersonation stack.
	const handleBack = () => {
		const entry = popToken();
		if (entry) setToken(entry.token);
	};

	// Straight back to the session that started the chain - three hops deep,
	// clicking back three times is busywork.
	const handleBackToRoot = () => {
		const root = tokenStack[0];
		if (!root) return;
		clearTokenStack();
		setToken(root.token);
	};

	const activeItem = navItems.find(({ path }) =>
		path === "/" ? location === path : location.startsWith(path),
	);

	const closeMenu = useCallback(() => setMenuOpen(false), []);

	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-200 backdrop-blur supports-[backdrop-filter]:bg-white/80">
			<div className="mx-auto max-w-5xl px-4 py-4 md:px-6 lg:px-0">
				<div className="flex items-center gap-3">
					{previous && (
						<div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-sm">
							<button
								type="button"
								onClick={handleBack}
								className="inline-flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								<i className="fa-solid fa-arrow-left" aria-hidden />
								{previous.label
									? strings("nav.backTo", [previous.label])
									: strings("nav.backToAdmin")}
							</button>
							{tokenStack.length > 1 && (
								<button
									type="button"
									onClick={handleBackToRoot}
									title={strings("nav.backToStart")}
									aria-label={strings("nav.backToStart")}
									className="inline-flex items-center gap-1 rounded-r-lg border-l border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
								>
									<i className="fa-solid fa-angles-left" aria-hidden />
									{tokenStack.length}
								</button>
							)}
						</div>
					)}
					<h1 className="text-xl font-semibold text-slate-900">
						{account?.name
							? strings("app.welcome", [account.name])
							: strings("app.name")}
					</h1>
					<div className="ml-auto flex items-center gap-3">
						{/* The operator badge doubles as the answer to "am I actually a
						    superadmin?" - every superadmin-only surface hangs off the same
						    flag, so its absence means the session is a plain realm admin. */}
						{isSuperadmin(account) && (
							<Link
								href="/platform"
								className="flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-200"
							>
								<i className="fa-solid fa-shield-halved" aria-hidden />
								{strings("nav.superadmin")}
							</Link>
						)}
						{account?.realm?.name && (
							<span
								className="flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
								// A superadmin still CARRIES a home realm (the API requires
								// one) but is never scoped to it, so naming it here read as
								// "you are inside HIBilet EU" when the session is in fact
								// cross-realm. The home realm moves to the tooltip.
								title={
									isSuperadmin(account)
										? strings("nav.homeRealm", [account.realm.name])
										: account.realm.name
								}
							>
								<span className="relative inline-flex">
									<span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
									<span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-500 opacity-75" />
								</span>
								{isSuperadmin(account)
									? strings("nav.allRealms")
									: account.realm.name}
							</span>
						)}
						<NotificationsBell />
					</div>
				</div>
				<nav aria-label="Main navigation" className="relative mt-4">
					<div className="hidden md:flex md:flex-nowrap md:overflow-x-auto md:scroll-smooth items-center gap-2">
						{barItems.map(({ path, labelKey, icon, tourId, liveOnly }) => {
							const isActive =
								path === "/" ? location === path : location.startsWith(path);
							return (
								<NavLink
									key={path}
									path={path}
									label={strings(labelKey)}
									icon={icon}
									isActive={isActive}
									tourId={tourId}
									hasBeating={liveOnly && hasEventsToday}
									disabled={!isNavItemEnabled(path)}
								/>
							);
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
							aria-hidden={!menuOpen}
							className={`mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg transition-[max-height,opacity] duration-200 ${menuOpen ? "max-h-96 opacity-100" : "invisible max-h-0 border-0 opacity-0"}`}
						>
							<div className="px-4 py-4">
								{/* Mobile keeps one flat list - a dropdown inside a dropdown is
								    worse than a long list on a phone. Same visibility rule. */}
								{barItems.map(({ path, labelKey, icon, tourId, liveOnly }) => {
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
												onNavigate={closeMenu}
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
