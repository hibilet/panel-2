import dayjs from 'dayjs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

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

const MONTH_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  value: i,
  label: i === 0 ? 'This month' : i === 1 ? '1 month ago' : `${i} months ago`,
}))

const SalesChart = ({
  data: dataProp,
  loading = false,
  sales = [],
  selectedSale = 'all',
  onSaleChange,
  selectedMonthOffset = 0,
  onMonthOffsetChange,
}) => {
  const chartMonth = dayjs().subtract(selectedMonthOffset, 'month')
  const data = dataProp ?? buildChartDataFromApi([], chartMonth.year(), chartMonth.month())
  const monthName = chartMonth.format('MMMM')
  const year = chartMonth.year()

  const formatCurrency = (value) => `₺${value.toLocaleString()}`

  return (
    <section aria-labelledby="sales-chart-heading" className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="sales-chart-heading" className="text-lg font-medium text-slate-900">
          Sales ({monthName} {year})
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMonthOffset}
            onChange={(e) => onMonthOffsetChange?.(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
            aria-label="Select month"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={selectedSale}
            onChange={(e) => onSaleChange?.(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
            aria-label="Filter by sale"
          >
            <option value="all">All sales</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center sm:h-80">
            <p className="text-slate-500">Loading chart…</p>
          </div>
        ) : (
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Daily sales']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.label ?? label
                  }
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="daily"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ fill: '#0f172a', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}

export default SalesChart
