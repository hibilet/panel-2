import { Link, Redirect, Route, Switch, useLocation } from "wouter";

import ErrorBoundary from "../../components/ErrorBoundary";
import Navbar from "../../components/global/Navbar";
import SellerSetupBanner from "../../components/global/SellerSetupBanner";
import { useApp } from "../../context";
import { canSee, isSuperadmin } from "../../lib/capabilities";
import strings from "../../localization";
import Accounts from "./Accounts";
import Analytics from "./Analytics";
import Dashboard from "./Dashboard";
import Events from "./Events";
import Home from "./Home";
import Invoices from "./Invoices";
import Invoice from "./Invoices/Invoice";
import Jobs from "./Jobs";
import Links from "./Links";
import Live from "./Live";
import Notifications from "./Notifications";
import Onboarding from "./Onboarding";
import Platform from "./Platform";
import Realms from "./Realms";
import Reports from "./Reports";
import Report from "./Reports/Report";
import ReportPrint from "./Reports/Report/Print";
import Sales from "./Sales";
import Sale from "./Sales/Sale";
import Settings from "./Settings";
import SettingsAgreements from "./Settings/Agreements";
import SettingsBilling from "./Settings/Billing";
import SettingsMailing from "./Settings/Mailing";
import SettingsMailTemplate from "./Settings/Mailing/MailTemplate";
import SettingsProviders from "./Settings/Providers";
import SettingsRealm from "./Settings/Realm";
import SettingsSubscription from "./Settings/Subscription";
import SettingsTeam from "./Settings/Team";
import Tiers from "./Tiers";
import Transactions from "./Transactions";
import Venues from "./Venues";

const NotFound = () => {
	return (
		<div className="mx-auto max-w-lg py-12 text-center">
			<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
				<i className="fa-solid fa-compass text-2xl" aria-hidden />
			</div>
			<h1 className="text-2xl font-semibold text-slate-900">
				{strings("error.notFoundTitle")}
			</h1>
			<p className="mt-2 text-sm text-slate-500">
				{strings("error.notFoundDesc")}
			</p>
			<Link
				href="/"
				className="mt-6 inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
			>
				<i className="fa-solid fa-arrow-left" aria-hidden />
				{strings("error.backToDashboard")}
			</Link>
		</div>
	);
};

const App = () => {
	const { account } = useApp();
	const [location] = useLocation();

	// Top-level Switch lets the print route match and own the document
	// (no Navbar, no banner, no Tailwind container) while still going
	// through wouter's Route so `useParams()` resolves `:id`.
	return (
		<Switch>
			<Route path="/reports/:id/print" component={ReportPrint} />
			<Route>
				<Navbar />
				<SellerSetupBanner />
				<main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
					{/* Keyed on location so navigating away clears a crashed page
					    instead of leaving the fallback stuck on every route. */}
					<ErrorBoundary key={location}>
						<Switch>
							<Route path="/live" component={Live} />
							{/* A superadmin lands on the launcher, not the aggregate dashboard
					    - which mixes every realm's numbers and is rarely what the
					    operator opened the panel for. The dashboard keeps its own
					    path for them. */}
							{isSuperadmin(account) ? (
								<>
									<Route path="/" component={Home} />
									<Route path="/dashboard" component={Dashboard} />
								</>
							) : (
								<Route path="/" component={Dashboard} />
							)}
							{canSee(account, "sales") && (
								<>
									<Route path="/sales" component={Sales} />
									<Route path="/sales/:id" component={Sale} />
									<Route path="/sales/:id/:tab" component={Sale} />
								</>
							)}
							{canSee(account, "transactions") && (
								<>
									<Route path="/transactions" component={Transactions} />
									<Route path="/transactions/:id" component={Transactions} />
								</>
							)}
							{canSee(account, "links") && (
								<>
									<Route path="/links/:id" component={Links} />
									<Route path="/links" component={Links} />
								</>
							)}
							{canSee(account, "analytics") && (
								<Route path="/analytics" component={Analytics} />
							)}
							{canSee(account, "reports") && (
								<>
									<Route path="/reports" component={Reports} />
									<Route path="/reports/:id" component={Report} />
								</>
							)}
							{canSee(account, "venues") && (
								<>
									<Route path="/venues/:id" component={Venues} />
									<Route path="/venues" component={Venues} />
								</>
							)}
							{/* Routes must be gated too, not just the nav. Hiding a link while
					    leaving its route reachable means a staff member who may not
					    see an area can still open it by typing the URL. */}
							{account?.type === "account.admin" &&
								canSee(account, "accounts") && (
									<>
										<Route
											path="/accounts/merchants/:id"
											component={Accounts}
										/>
										<Route
											path="/accounts/customers/:id"
											component={Accounts}
										/>
										<Route path="/accounts/merchants" component={Accounts} />
										<Route path="/accounts/customers" component={Accounts} />
										<Route path="/accounts">
											<Redirect to="/accounts/merchants" />
										</Route>
										<Route path="/tiers/:id" component={Tiers} />
										<Route path="/tiers" component={Tiers} />
									</>
								)}
							{isSuperadmin(account) && (
								<>
									<Route path="/platform" component={Platform} />
									<Route path="/realms/:id" component={Realms} />
									<Route path="/realms" component={Realms} />
									<Route path="/events" component={Events} />
								</>
							)}
							{canSee(account, "invoices") && (
								<>
									<Route path="/invoices/:id" component={Invoice} />
									<Route path="/invoices" component={Invoices} />
								</>
							)}
							<Route path="/jobs/:id" component={Jobs} />
							<Route path="/jobs" component={Jobs} />
							<Route path="/notifications" component={Notifications} />
							<Route path="/settings" component={Settings} />
							<Route path="/settings/providers" component={SettingsProviders} />
							<Route
								path="/settings/providers/:id"
								component={SettingsProviders}
							/>
							<Route path="/settings/mailing" component={SettingsMailing} />
							<Route path="/settings/billing" component={SettingsBilling} />
							<Route
								path="/settings/mailing/template"
								component={SettingsMailTemplate}
							/>
							<Route
								path="/settings/agreements"
								component={SettingsAgreements}
							/>
							<Route
								path="/settings/agreements/:id"
								component={SettingsAgreements}
							/>
							<Route
								path="/settings/subscription"
								component={SettingsSubscription}
							/>
							{/* Team management is the merchant's own; staff are refused by the
					    API and see an explanatory panel instead. */}
							{canSee(account, "settings") && (
								<Route path="/settings/team" component={SettingsTeam} />
							)}
							{account?.type === "account.admin" &&
								canSee(account, "settings") && (
									<Route path="/settings/realm" component={SettingsRealm} />
								)}
							<Route path="*">
								<NotFound />
							</Route>
						</Switch>
					</ErrorBoundary>
				</main>
			</Route>
		</Switch>
	);
};

export default App;
