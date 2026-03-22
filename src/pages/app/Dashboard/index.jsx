import { useTour } from "@reactour/tour";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import { Link } from "wouter";
import CompletionStepsWizard, {
	shouldShowCompletionWizard,
} from "../../../components/CompletionStepsWizard";
import SalesChart from "../../../components/charts/SalesChart";
import { StatCard } from "../../../components/shared";
import { transactionsColumns } from "../../../components/tables/columns";
import DataTable from "../../../components/tables/DataTable";
import WeeklyEventSaleMatrix from "../../../components/tables/WeeklyEventSaleMatrix";
import { useApp } from "../../../context";
import { get } from "../../../lib/client";
import strings, { formatCurrency } from "../../../localization";

const buildChartDataFromApi = (apiData = [], year, month) => {
	const daysInMonth = dayjs().year(year).month(month).daysInMonth();
	const byDate = Object.fromEntries((apiData ?? []).map((d) => [d.date, d]));
	const data = [];
	const monthName = dayjs().month(month).format("MMM");
	for (let day = 1; day <= daysInMonth; day++) {
		const dateStr = dayjs()
			.year(year)
			.month(month)
			.date(day)
			.format("YYYY-MM-DD");
		const dayData = byDate[dateStr];
		const daily = dayData ? dayData.total : 0;
		data.push({
			date: `${day}`,
			label: `${day} ${monthName}`,
			daily,
		});
	}
	return data;
};

const buildWeeklyMatrixFromSalesReport = (apiData = []) => {
	const byName = {};
	for (const item of apiData ?? []) {
		if (!byName[item.name]) byName[item.name] = { eventName: item.name };
		const dayOfWeek = dayjs(item.day).day();
		const key = `weekday${dayOfWeek === 0 ? 7 : dayOfWeek}`;
		byName[item.name][key] = (byName[item.name][key] ?? 0) + (item.count ?? 0);
	}
	return Object.values(byName);
};

const currentMonthStart = () => dayjs().startOf("month").format("YYYY-MM-DD");

const Dashboard = () => {
	const { account, sales, loading: appLoading } = useApp();
	const { setIsOpen, setCurrentStep } = useTour();

	const startTour = () => {
		setCurrentStep(0);
		setIsOpen(true);
	};
	const [todaySales, setTodaySales] = useState(null);
	const [yesterdaySales, setYesterdaySales] = useState(null);
	const [mtdSales, setMtdSales] = useState(null);
	const [mtdProductsSold, setMtdProductsSold] = useState(null);
	const [lastMonthSales, setLastMonthSales] = useState(null);
	const [lastMonthProductsSold, setLastMonthProductsSold] = useState(null);
	const [chartData, setChartData] = useState(null);
	const [currentMonthChartData, setCurrentMonthChartData] = useState(null);

	const commission = account?.commission ?? {
		amount: 0,
		vat: 1.19,
		type: "fixed",
	};
	const amountDue =
		(mtdProductsSold ?? 0) *
		((commission.type === "fixed" ? 0 : 1) + (commission.amount ?? 0));
	const subtotal = amountDue * (commission.vat ?? 1.19);
	const vatPercent = Math.round(((commission.vat ?? 1.19) - 1) * 100);
	const [chartLoading, setChartLoading] = useState(true);
	const [selectedSale, setSelectedSale] = useState("all");
	const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
	const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
	const [weeklyEvents, setWeeklyEvents] = useState([]);
	const [weeklyMatrixLoading, setWeeklyMatrixLoading] = useState(true);
	const [recentTransactions, setRecentTransactions] = useState([]);
	const [error, setError] = useState(null);

	const today = dayjs().format("YYYY-MM-DD");
	const chartMonth = dayjs().subtract(selectedMonthOffset, "month");
	const monthStart = chartMonth.startOf("month").format("YYYY-MM-DD");
	const monthEnd = chartMonth.endOf("month").format("YYYY-MM-DD");
	const currentWeekMonday = dayjs().subtract((dayjs().day() + 6) % 7, "day");
	const selectedWeekMonday = currentWeekMonday.subtract(
		selectedWeekOffset,
		"week",
	);
	const weekStart = selectedWeekMonday.format("YYYY-MM-DD");
	const weekEnd = selectedWeekMonday.add(6, "day").format("YYYY-MM-DD");

	useEffect(() => {
		const params = new URLSearchParams({
			status: "success",
			test: "true",
		});
		const mtdStart = currentMonthStart();
		const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
		const lastMonth = dayjs().subtract(1, "month");
		const lastMonthStart = lastMonth.startOf("month").format("YYYY-MM-DD");
		// Same-period comparison: compare MTD (e.g. Mar 1–22) to same days last month (e.g. Feb 1–22)
		const lastMonthDaysInMonth = lastMonth.daysInMonth();
		const currentDayOfMonth = dayjs().date();
		const lastMonthSameDay = Math.min(currentDayOfMonth, lastMonthDaysInMonth);
		const lastMonthEnd = lastMonth
			.date(lastMonthSameDay)
			.format("YYYY-MM-DD");

		Promise.all([
			get(
				`/dashboards/transactions/between?start=${today}&end=${today}&sale=all&${params}`,
			),
			get(
				`/dashboards/transactions/between?start=${yesterday}&end=${yesterday}&sale=all&${params}`,
			),
			get(
				`/dashboards/transactions/between?start=${mtdStart}&end=${today}&sale=all&${params}`,
			),
			get(
				`/dashboards/transactions/between?start=${lastMonthStart}&end=${lastMonthEnd}&sale=all&${params}`,
			),
			get("/transactions/search?limit=5&skip=0&status=success"),
		])
			.then(([todayRes, yesterdayRes, mtdRes, lastMonthRes, transactionsRes]) => {
				const todayData = todayRes.data?.[0];
				setTodaySales(todayData?.total ?? 0);

				const yesterdayData = yesterdayRes.data?.[0];
				setYesterdaySales(yesterdayData?.total ?? 0);

				const mtdData = mtdRes.data ?? [];
				const mtdTotal = mtdData.reduce((sum, d) => sum + (d.total ?? 0), 0);
				const mtdCount = mtdData.reduce((sum, d) => sum + (d.count ?? 0), 0);
				setMtdSales(mtdTotal);
				setMtdProductsSold(mtdCount);

				const lastMonthData = lastMonthRes.data ?? [];
				const lastTotal = lastMonthData.reduce((sum, d) => sum + (d.total ?? 0), 0);
				const lastCount = lastMonthData.reduce((sum, d) => sum + (d.count ?? 0), 0);
				setLastMonthSales(lastTotal);
				setLastMonthProductsSold(lastCount);

				setRecentTransactions(transactionsRes.data ?? []);
			})
			.catch((err) => {
				setError(err?.message ?? strings("error.failedLoadDashboard"));
			});
	}, [today]);

	useEffect(() => {
		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) setWeeklyMatrixLoading(true);
		});

		get(
			`/sales/reports/sales?period=week&start=${weekStart}&end=${weekEnd}&countType=nominal&sale=`,
		)
			.then((res) => {
				if (!cancelled) {
					setWeeklyEvents(buildWeeklyMatrixFromSalesReport(res.data ?? []));
				}
			})
			.catch(() => {
				if (!cancelled) setWeeklyEvents([]);
			})
			.finally(() => {
				if (!cancelled) setWeeklyMatrixLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [weekStart, weekEnd]);

	useEffect(() => {
		const params = new URLSearchParams({
			status: "success",
			sale: selectedSale,
			test: "true",
		});

		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) setChartLoading(true);
		});

		const targetMonth = dayjs(monthStart);
		const isCurrentMonth = selectedMonthOffset === 0;

		get(
			`/dashboards/transactions/between?start=${monthStart}&end=${monthEnd}&${params}`,
		)
			.then((res) => {
				if (cancelled) return;
				const data = buildChartDataFromApi(
					res.data ?? [],
					targetMonth.year(),
					targetMonth.month(),
				);
				setChartData(data);
				if (isCurrentMonth) setCurrentMonthChartData(data);
			})
			.catch(() => {
				if (!cancelled) setChartData([]);
			})
			.finally(() => {
				if (!cancelled) setChartLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [selectedSale, monthStart, monthEnd, selectedMonthOffset]);

	useEffect(() => {
		if (selectedMonthOffset === 0 || currentMonthChartData) return;

		const params = new URLSearchParams({
			status: "success",
			sale: selectedSale,
			test: "true",
		});
		const currentMonthStartStr = dayjs().startOf("month").format("YYYY-MM-DD");
		const currentMonthEndStr = dayjs().endOf("month").format("YYYY-MM-DD");

		let cancelled = false;
		get(
			`/dashboards/transactions/between?start=${currentMonthStartStr}&end=${currentMonthEndStr}&${params}`,
		)
			.then((res) => {
				if (cancelled) return;
				const now = dayjs();
				const data = buildChartDataFromApi(
					res.data ?? [],
					now.year(),
					now.month(),
				);
				setCurrentMonthChartData(data);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [selectedMonthOffset, currentMonthChartData, selectedSale]);

	const statsLoading =
		(todaySales === null && mtdSales === null && mtdProductsSold === null) ||
		appLoading;

	const buildComparison = (current, previous, formatValue, label) => {
		if (current == null || previous == null) return null;
		const diff = current - previous;
		const percent =
			previous === 0
				? (current > 0 ? 100 : 0)
				: ((current - previous) / previous) * 100;
		return {
			diff,
			percent,
			formattedDiff: formatValue(diff),
			label,
		};
	};

	const todayVsYesterday = buildComparison(
		todaySales ?? 0,
		yesterdaySales ?? 0,
		(d) => formatCurrency(d),
		strings("dashboard.stats.vsYesterday"),
	);
	const mtdVsLastMonth = buildComparison(
		mtdSales ?? 0,
		lastMonthSales ?? 0,
		(d) => formatCurrency(d),
		strings("dashboard.stats.vsLastMonth"),
	);
	const mtdProductsVsLastMonth = buildComparison(
		mtdProductsSold ?? 0,
		lastMonthProductsSold ?? 0,
		(d) => String(d),
		strings("dashboard.stats.vsLastMonth"),
	);

	if (error && todaySales === null) {
		return (
			<div className="mx-auto max-w-5xl">
				<div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
					{error}
				</div>
			</div>
		);
	}

	const showWizard = shouldShowCompletionWizard(account);

	return (
		<div className="mx-auto max-w-5xl relative">
			<CompletionStepsWizard />

			<div
				className={`grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8 ${showWizard ? "mt-8" : ""}`}
				data-tour="dashboard-stats"
			>
				<StatCard
					label={strings("dashboard.stats.todaySales")}
					value={formatCurrency(todaySales ?? 0)}
					loading={statsLoading}
					comparison={todayVsYesterday}
				/>
				<StatCard
					label={strings("dashboard.stats.mtdSales")}
					value={formatCurrency(mtdSales ?? 0)}
					loading={statsLoading}
					comparison={mtdVsLastMonth}
				/>
				<StatCard
					label={strings("dashboard.stats.mtdProductsSold")}
					value={mtdProductsSold ?? 0}
					loading={statsLoading}
					comparison={mtdProductsVsLastMonth}
				/>
				{statsLoading ? (
					<StatCard
						label={strings("dashboard.stats.amountDue")}
						value=""
						loading
					/>
				) : (
					<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
						<p className="text-sm text-slate-500">
							{strings("dashboard.stats.amountDue")}
						</p>
						<p className="mt-1 text-2xl font-bold text-slate-900">
							{formatCurrency(amountDue)} 
							<span className="text-sm text-slate-500 ml-1">
								+ {vatPercent}% {strings("common.vat")}
							</span>
						</p>
						<p className="mt-1 text-xs font-bold text-slate-500">
							{formatCurrency(subtotal)} {strings("common.total")}
						</p>
					</div>
				)}
			</div>

			<SalesChart
				data={chartData}
				compareData={selectedMonthOffset > 0 ? currentMonthChartData : null}
				loading={chartLoading}
				sales={sales}
				selectedSale={selectedSale}
				onSaleChange={setSelectedSale}
				selectedMonthOffset={selectedMonthOffset}
				onMonthOffsetChange={setSelectedMonthOffset}
			/>

			<section
				aria-labelledby="weekly-events-heading"
				className="mb-8"
				data-tour="dashboard-weekly-events"
			>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<h2
						id="weekly-events-heading"
						className="text-lg font-medium text-slate-900"
					>
						{strings("dashboard.weeklyMatrix")}
					</h2>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setSelectedWeekOffset((o) => Math.min(o + 1, 6))}
							disabled={selectedWeekOffset >= 6}
							className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={strings("common.previousWeek")}
						>
							‹
						</button>
						<span className="min-w-[180px] text-center text-sm text-slate-600">
							{selectedWeekMonday.format("MMM D")} –{" "}
							{selectedWeekMonday.add(6, "day").format("MMM D, YYYY")}
						</span>
						<button
							type="button"
							onClick={() => setSelectedWeekOffset((o) => Math.max(o - 1, 0))}
							disabled={selectedWeekOffset <= 0}
							className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={strings("common.nextWeek")}
						>
							›
						</button>
					</div>
				</div>
				<WeeklyEventSaleMatrix
					data={weeklyEvents}
					valueFormat="count"
					loading={weeklyMatrixLoading}
				/>
			</section>

			<section
				aria-labelledby="recent-heading"
				data-tour="dashboard-recent-activity"
			>
				<div className="mb-4 flex items-center justify-between">
					<h2
						id="recent-heading"
						className="text-lg font-medium text-slate-900"
					>
						{strings("dashboard.recentActivity")}
					</h2>
					<Link
						data-tour="dashboard-recent-activity-view-all"
						href="/transactions"
						className="text-sm font-medium text-slate-600 hover:text-slate-900"
					>
						{strings("common.viewAll")}
					</Link>
				</div>
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<DataTable
						data={recentTransactions}
						columns={transactionsColumns}
						getRowKey={(r) => r.id}
						bare
						loading={statsLoading}
						emptyMessage={strings("table.transaction.noTransactions")}
					/>
				</div>
			</section>

			{/* <button
				type="button"
				onClick={startTour}
				aria-label={strings("tour.start")}
				className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
			>
				<i className="fa-solid fa-question-circle" aria-hidden />
			</button> */}
		</div>
	);
};

export default Dashboard;
