import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";

import Navbar from "../../components/global/Navbar";
import { useApp } from "../../context";
import Accounts from "./Accounts";
import Dashboard from "./Dashboard";
import Links from "./Links";
import Live from "./Live";
import Onboarding from "./Onboarding";
import Reports from "./Reports";
import Report from "./Reports/Report";
import Sales from "./Sales";
import Sale from "./Sales/Sale";
import Settings from "./Settings";
import SettingsAgreements from "./Settings/Agreements";
import SettingsMailing from "./Settings/Mailing";
import SettingsProviders from "./Settings/Providers";
import Transactions from "./Transactions";
import Venues from "./Venues";

const NotFound = () => {
	return (
		<div className="mx-auto max-w-5xl">
			<h1 className="text-2xl font-semibold text-slate-900">404 Not Found</h1>
		</div>
	);
};

const App = () => {
	const { account } = useApp();
	return (
		<>
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
				<Switch>
					<Route path="/live" component={Live} />
					<Route path="/" component={Dashboard} />
					<Route path="/sales" component={Sales} />
					<Route path="/sales/:id" component={Sale} />
					<Route path="/sales/:id/:tab" component={Sale} />
					<Route path="/transactions" component={Transactions} />
					<Route path="/transactions/:id" component={Transactions} />
					<Route path="/links" component={Links} />
					<Route path="/links/:id" component={Links} />
					<Route path="/reports" component={Reports} />
					<Route path="/reports/:id" component={Report} />
					<Route path="/venues/:id" component={Venues} />
					<Route path="/venues" component={Venues} />
					{account?.type === "account.admin" && (
						<>
							<Route path="/accounts/merchants/:id" component={Accounts} />
							<Route path="/accounts/customers/:id" component={Accounts} />
							<Route path="/accounts/merchants" component={Accounts} />
							<Route path="/accounts/customers" component={Accounts} />
							<Redirect to="/accounts/merchants" />
						</>
					)}
					<Route path="/settings" component={Settings} />
					<Route path="/settings/providers" component={SettingsProviders} />
					<Route path="/settings/providers/:id" component={SettingsProviders} />
					<Route path="/settings/mailing" component={SettingsMailing} />
					<Route path="/settings/agreements" component={SettingsAgreements} />
					<Route
						path="/settings/agreements/:id"
						component={SettingsAgreements}
					/>
					<Route path="*">
						<NotFound />
					</Route>
				</Switch>
			</main>
		</>
	);
};

export default App;
