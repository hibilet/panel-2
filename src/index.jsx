import { createRoot } from "react-dom/client";
import "./styles/index.css";

import { TourProvider } from "@reactour/tour";
import { dashboardTourSteps } from "./components/tours/DashboardTour";
import { AppProvider } from "./context";
import { getToken } from "./lib/storage";

import App from "./pages/app";
import Auth from "./pages/auth";

createRoot(document.body).render(
	<AppProvider>
		<TourProvider steps={dashboardTourSteps}>
			{getToken() ? <App /> : <Auth />}
		</TourProvider>
	</AppProvider>,
);
