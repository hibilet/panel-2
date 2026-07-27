import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./lib/firebase";
import profiles from "./configs.json";

const host = typeof window !== "undefined" ? window.location.hostname : "";

// Exact host first, then the registrable domain, so any tixcore.de host
// (panel., dashboard., a preview subdomain) still gets the Tixcore branding
// instead of silently falling back to HIBilet.
const resolveProfile = (hostname) => {
	if (profiles.profiles[hostname]) return profiles.profiles[hostname];
	const parts = hostname.split(".");
	for (let i = 0; i < parts.length - 1; i += 1) {
		const suffix = parts.slice(i).join(".");
		if (profiles.domains?.[suffix]) return profiles.domains[suffix];
	}
	return profiles.profiles["panel.hibilet.com"];
};

const profile = resolveProfile(host);
if (typeof document !== "undefined") {
	document.title = profile.title;
	// The <link rel="icon"> may not exist yet (index.html ships one, but a
	// stripped host page might not) - create it rather than skipping, which is
	// how the favicon silently never got applied before.
	let link = document.querySelector('link[rel="icon"]');
	if (!link) {
		link = document.createElement("link");
		link.rel = "icon";
		document.head.appendChild(link);
	}
	link.type = profile.favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
	link.href = `/${profile.favicon}`;
}

import { TourProvider } from "@reactour/tour";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import ErrorBoundary from "./components/ErrorBoundary";
import { dashboardTourSteps } from "./components/tours/DashboardTour";
import { AppProvider, NotificationsProvider, ToastProvider } from "./context";
import { getToken } from "./lib/storage";

dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Berlin");

import App from "./pages/app";
import Auth from "./pages/auth";

// /oauth handles Stripe OAuth and email-OTP returns - it must run even
// when the user is already authenticated (eg attaching a Stripe Connect
// account to an existing merchant session). Without this branch, a logged-
// in user returning from Stripe lands on the dashboard and the token /
// error from the URL are silently dropped.
const isOAuthCallback = typeof window !== "undefined"
	&& window.location.pathname === "/oauth";

createRoot(document.body).render(
	<ToastProvider>
		<AppProvider>
			<NotificationsProvider>
				<TourProvider steps={dashboardTourSteps}>
					<ErrorBoundary>
						{isOAuthCallback ? <Auth /> : (getToken() ? <App /> : <Auth />)}
					</ErrorBoundary>
				</TourProvider>
			</NotificationsProvider>
		</AppProvider>
	</ToastProvider>,
);
