import { Route, Switch } from "wouter";

import Navbar from "../../components/global/Navbar";
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
import SettingsProviders from "./Settings/Providers";
import Transactions from "./Transactions";

const App = () => {
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
					<Route path="/accounts" component={Accounts} />
					<Route path="/accounts/:id" component={Accounts} />
					<Route path="/settings" component={Settings} />
					<Route path="/settings/providers" component={SettingsProviders} />
					<Route path="/settings/providers/:id" component={SettingsProviders} />
					<Route path="/settings/agreements" component={SettingsAgreements} />
					<Route
						path="/settings/agreements/:id"
						component={SettingsAgreements}
					/>
				</Switch>
			</main>
		</>
	);
};

export default App;
