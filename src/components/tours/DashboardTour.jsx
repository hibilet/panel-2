import strings from "../../localization";

export const dashboardTourSteps = [
	{
		selector: '[data-tour="nav-dashboard"]',
		content: strings("tour.step.dashboard"),
		position: "bottom",
	},
	{
		selector: '[data-tour="nav-sales"]',
		content: strings("tour.step.sales"),
		position: "bottom",
	},
	{
		selector: '[data-tour="nav-links"]',
		content: strings("tour.step.links"),
		position: "bottom",
	},
	{
		selector: '[data-tour="nav-transactions"]',
		content: strings("tour.step.transactions"),
		position: "bottom",
	},
	{
		selector: '[data-tour="nav-reports"]',
		content: strings("tour.step.reports"),
		position: "bottom",
	},
	{
		selector: '[data-tour="nav-settings"]',
		content: strings("tour.step.settings"),
		position: "bottom",
	},
	{
		selector: '[data-tour="dashboard-stats"]',
		content: strings("tour.step.dashboardStats"),
		position: "bottom",
	},
	{
		selector: '[data-tour="dashboard-sales-chart"]',
		content: strings("tour.step.dashboardSalesChart"),
		position: "bottom",
	},
	{
		selector: '[data-tour="dashboard-weekly-events"]',
		content: strings("tour.step.dashboardWeeklyEvents"),
		position: "bottom",
	},
	{
		selector: '[data-tour="dashboard-recent-activity"]',
		content: strings("tour.step.dashboardRecentActivity"),
		position: "bottom",
	},
	{
		selector: '[data-tour="dashboard-recent-activity-view-all"]',
		content: strings("tour.step.dashboardRecentActivityViewAll"),
		position: "bottom",
	},
];
