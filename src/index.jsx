import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";

import { TourProvider } from "@reactour/tour";
import { AppProvider } from "./context";
import { dashboardTourSteps } from "./components/tours/DashboardTour";
import { getToken } from "./lib/storage";

import App from "./pages/app";
import Auth from "./pages/auth";

createRoot(document.body).render(
	<StrictMode>
		<AppProvider>
			<TourProvider steps={dashboardTourSteps}>
				{getToken() ? <App /> : <Auth />}
			</TourProvider>
		</AppProvider>
	</StrictMode>,
);
