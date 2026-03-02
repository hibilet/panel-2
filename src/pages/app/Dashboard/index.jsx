import { useEffect, useState } from 'react'
import dayjs from 'dayjs'

import { Link } from 'wouter'
import { get } from '../../../lib/client'
import { useApp } from '../../../context'
import SalesChart from '../../../components/charts/SalesChart'
import TransactionsTable from '../../../components/tables/TransactionsTable'
import WeeklyEventSaleMatrix from '../../../components/tables/WeeklyEventSaleMatrix'
import { StatCard } from '../../../components/shared'
import strings, { formatCurrency } from '../../../localization'

const buildChartDataFromApi = (apiData = [], year, month) => {
  const daysInMonth = dayjs().year(year).month(month).daysInMonth()
  const byDate = Object.fromEntries(
    (apiData ?? []).map((d) => [d.date, d])
  )
  const data = []
  const monthName = dayjs().month(month).format('MMM')
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = dayjs().year(year).month(month).date(day).format('YYYY-MM-DD')
    const dayData = byDate[dateStr]
    const daily = dayData ? dayData.total : 0
    data.push({
      date: `${day}`,
      label: `${day} ${monthName}`,
      daily,
    })
  }
  return data
}

const buildWeeklyMatrixFromSalesReport = (apiData = []) => {
  const byName = {}
  for (const item of apiData ?? []) {
    if (!byName[item.name]) byName[item.name] = { eventName: item.name }
    const dayOfWeek = dayjs(item.day).day()
    const key = `weekday${dayOfWeek === 0 ? 7 : dayOfWeek}`
    byName[item.name][key] = (byName[item.name][key] ?? 0) + (item.count ?? 0)
  }
  return Object.values(byName)
}

const currentMonthStart = () => dayjs().startOf('month').format('YYYY-MM-DD')

const Dashboard = () => {
  const { sales, loading: appLoading } = useApp()
  const [todaySales, setTodaySales] = useState(null)
  const [mtdSales, setMtdSales] = useState(null)
  const [mtdProductsSold, setMtdProductsSold] = useState(null)
  const [chartData, setChartData] = useState(null)

  const activeSalesCount = sales.filter((s) => s.status === 'active').length
  const [chartLoading, setChartLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState('all')
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0)
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0)
  const [weeklyEvents, setWeeklyEvents] = useState([])
  const [weeklyMatrixLoading, setWeeklyMatrixLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [error, setError] = useState(null)

  const today = dayjs().format('YYYY-MM-DD')
  const chartMonth = dayjs().subtract(selectedMonthOffset, 'month')
  const monthStart = chartMonth.startOf('month').format('YYYY-MM-DD')
  const monthEnd = chartMonth.endOf('month').format('YYYY-MM-DD')
  const currentWeekMonday = dayjs().subtract((dayjs().day() + 6) % 7, 'day')
  const selectedWeekMonday = currentWeekMonday.subtract(selectedWeekOffset, 'week')
  const weekStart = selectedWeekMonday.format('YYYY-MM-DD')
  const weekEnd = selectedWeekMonday.add(6, 'day').format('YYYY-MM-DD')

  useEffect(() => {
    const params = new URLSearchParams({
      status: 'success',
      test: 'true',
    })
    const mtdStart = currentMonthStart()

    Promise.all([
      get(`/dashboards/transactions/between?start=${today}&end=${today}&sale=all&${params}`),
      get(`/dashboards/transactions/between?start=${mtdStart}&end=${today}&sale=all&${params}`),
      get('/transactions/search?limit=5&skip=0&status=success'),
    ])
      .then(([todayRes, mtdRes, transactionsRes]) => {
        const todayData = todayRes.data?.[0]
        setTodaySales(todayData?.total ?? 0)

        const mtdData = mtdRes.data ?? []
        const mtdTotal = mtdData.reduce((sum, d) => sum + (d.total ?? 0), 0)
        const mtdCount = mtdData.reduce((sum, d) => sum + (d.count ?? 0), 0)
        setMtdSales(mtdTotal)
        setMtdProductsSold(mtdCount)

        setRecentTransactions(transactionsRes.data ?? [])
      })
      .catch((err) => {
        setError(err?.message ?? strings('error.failedLoadDashboard'))
      })
  }, [today])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setWeeklyMatrixLoading(true)
    })

    get(`/sales/reports/sales?period=week&start=${weekStart}&end=${weekEnd}&countType=nominal&sale=`)
      .then((res) => {
        if (!cancelled) {
          setWeeklyEvents(buildWeeklyMatrixFromSalesReport(res.data ?? []))
        }
      })
      .catch(() => {
        if (!cancelled) setWeeklyEvents([])
      })
      .finally(() => {
        if (!cancelled) setWeeklyMatrixLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [weekStart, weekEnd])

  useEffect(() => {
    const params = new URLSearchParams({
      status: 'success',
      sale: selectedSale,
      test: 'true',
    })

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setChartLoading(true)
    })

    const targetMonth = dayjs(monthStart)
    get(`/dashboards/transactions/between?start=${monthStart}&end=${monthEnd}&${params}`)
      .then((res) => {
        if (cancelled) return
        setChartData(
          buildChartDataFromApi(res.data ?? [], targetMonth.year(), targetMonth.month())
        )
      })
      .catch(() => {
        if (!cancelled) setChartData([])
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSale, monthStart, monthEnd])

  const statsLoading =
    (todaySales === null &&
      mtdSales === null &&
      mtdProductsSold === null) ||
    appLoading

  if (error && todaySales === null) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">Quick stats</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label={strings('dashboard.stats.todaySales')}
            value={formatCurrency(todaySales ?? 0)}
            loading={statsLoading}
          />
          <StatCard
            label={strings('dashboard.stats.mtdSales')}
            value={formatCurrency(mtdSales ?? 0)}
            loading={statsLoading}
          />
          <StatCard
            label={strings('dashboard.stats.mtdProductsSold')}
            value={mtdProductsSold ?? 0}
            loading={statsLoading}
          />
          <StatCard
            label={strings('dashboard.stats.activeSales')}
            value={activeSalesCount ?? 0}
            loading={statsLoading}
          />
        </div>
      </section>

      <SalesChart
        data={chartData}
        loading={chartLoading}
        sales={sales}
        selectedSale={selectedSale}
        onSaleChange={setSelectedSale}
        selectedMonthOffset={selectedMonthOffset}
        onMonthOffsetChange={setSelectedMonthOffset}
      />

      <section aria-labelledby="weekly-events-heading" className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="weekly-events-heading" className="text-lg font-medium text-slate-900">
            {strings('dashboard.weeklyMatrix')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedWeekOffset((o) => Math.min(o + 1, 6))}
              disabled={selectedWeekOffset >= 6}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={strings('common.previousWeek')}
            >
              ‹
            </button>
            <span className="min-w-[180px] text-center text-sm text-slate-600">
              {selectedWeekMonday.format('MMM D')} – {selectedWeekMonday.add(6, 'day').format('MMM D, YYYY')}
            </span>
            <button
              type="button"
              onClick={() => setSelectedWeekOffset((o) => Math.max(o - 1, 0))}
              disabled={selectedWeekOffset <= 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={strings('common.nextWeek')}
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

      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-medium text-slate-900">
            {strings('dashboard.recentActivity')}
          </h2>
          <Link
            href="/transactions"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {strings('common.viewAll')}
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <TransactionsTable
            data={recentTransactions}
            bare
            loading={statsLoading}
          />
        </div>
      </section>
    </div>
  )
}

export default Dashboard
