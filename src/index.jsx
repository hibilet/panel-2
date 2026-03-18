import { createRoot } from "react-dom/client";
import "./styles/index.css";
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
import { AppProvider, ToastProvider } from "./context";
import { getToken } from "./lib/storage";

dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Berlin");

import App from "./pages/app";
import Auth from "./pages/auth";

createRoot(document.body).render(
	<ToastProvider>
		<AppProvider>
			<TourProvider steps={dashboardTourSteps}>
				{getToken() ? <App /> : <Auth />}
			</TourProvider>
		</AppProvider>
	</ToastProvider>,
);
