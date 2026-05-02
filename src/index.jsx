import { createRoot } from "react-dom/client";
import "./styles/index.css";
import "./lib/firebase";
import profiles from "./configs.json";

const host = typeof window !== "undefined" ? window.location.hostname : "";
const profile = profiles.profiles[host] ?? profiles.profiles["panel.hibilet.com"];
if (typeof document !== "undefined") {
	document.title = profile.title;
	const link = document.querySelector('link[rel="icon"]');
	if (link) link.href = `/${profile.favicon}`;
}

import { TourProvider } from "@reactour/tour";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
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
					{isOAuthCallback ? <Auth /> : (getToken() ? <App /> : <Auth />)}
				</TourProvider>
			</NotificationsProvider>
		</AppProvider>
	</ToastProvider>,
);
