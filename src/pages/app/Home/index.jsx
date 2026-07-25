import { Link } from "wouter";
import strings from "../../../localization";

// Superadmin landing. The nav bar carries ~14 destinations for this role, which
// reads as noise; the launcher is the map. Labels reuse the nav keys so a
// renamed section cannot drift between the two.
const GROUPS = [
	{
		titleKey: "home.group.platform",
		tiles: [
			{
				path: "/platform",
				labelKey: "nav.platform",
				icon: "fa-tower-broadcast",
			},
			{ path: "/realms", labelKey: "nav.realms", icon: "fa-layer-group" },
			{ path: "/events", labelKey: "nav.events", icon: "fa-clipboard-list" },
			{ path: "/jobs", labelKey: "nav.jobs", icon: "fa-clock-rotate-left" },
		],
	},
	{
		titleKey: "home.group.commerce",
		tiles: [
			{ path: "/accounts", labelKey: "nav.accounts", icon: "fa-users" },
			{ path: "/tiers", labelKey: "nav.tiers", icon: "fa-layer-group" },
			{
				path: "/invoices",
				labelKey: "nav.invoices",
				icon: "fa-file-invoice-dollar",
			},
			{
				path: "/transactions",
				labelKey: "nav.transactions",
				icon: "fa-receipt",
			},
		],
	},
	{
		titleKey: "home.group.events",
		tiles: [
			{ path: "/sales", labelKey: "nav.sales", icon: "fa-cart-shopping" },
			{ path: "/venues", labelKey: "nav.venues", icon: "fa-building" },
			{ path: "/links", labelKey: "nav.links", icon: "fa-link" },
			{ path: "/live", labelKey: "nav.live", icon: "fa-bolt" },
		],
	},
	{
		titleKey: "home.group.insight",
		tiles: [
			{ path: "/dashboard", labelKey: "nav.dashboard", icon: "fa-gauge-high" },
			{ path: "/analytics", labelKey: "nav.analytics", icon: "fa-chart-pie" },
			{ path: "/reports", labelKey: "nav.reports", icon: "fa-chart-line" },
			{ path: "/settings", labelKey: "nav.settings", icon: "fa-gear" },
		],
	},
];

const Home = () => (
	<div className="mx-auto max-w-5xl space-y-8">
		<div>
			<h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
				<i className="fa-solid fa-shield-halved text-violet-600" aria-hidden />
				{strings("home.title")}
			</h1>
			<p className="mt-1 text-sm text-slate-500">{strings("home.subtitle")}</p>
		</div>

		{GROUPS.map((group) => (
			<section key={group.titleKey} className="space-y-3">
				<h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
					{strings(group.titleKey)}
				</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{group.tiles.map(({ path, labelKey, icon }) => (
						<Link
							key={path}
							href={path}
							className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
						>
							<span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
								<i className={`fa-solid ${icon}`} aria-hidden />
							</span>
							<span className="text-sm font-medium text-slate-900">
								{strings(labelKey)}
							</span>
						</Link>
					))}
				</div>
			</section>
		))}
	</div>
);

export default Home;
