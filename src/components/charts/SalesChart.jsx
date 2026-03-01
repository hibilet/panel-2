import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const useMonthlySalesData = () => {
  return useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Generate daily sales data for this month (mock data until API is connected)
    const data = []
    let cumulative = 0
    const seed = year * 100 + month
    for (let day = 1; day <= daysInMonth; day++) {
      const dailyAmount = ((seed * 31 + day) % 800) + 200
      cumulative += dailyAmount
      data.push({
        date: `${day}`,
        label: `${day} ${now.toLocaleString('default', { month: 'short' })}`,
        sales: cumulative,
        daily: dailyAmount,
      })
    }

    return data
  }, [])
}

const SalesChart = () => {
  const data = useMonthlySalesData()
  const monthName = new Date().toLocaleString('default', { month: 'long' })
  const year = new Date().getFullYear()

  const formatCurrency = (value) => `₺${value.toLocaleString()}`

  return (
    <section aria-labelledby="sales-chart-heading" className="mb-8">
      <h2 id="sales-chart-heading" className="mb-4 text-lg font-medium text-slate-900">
        Sales this month ({monthName} {year})
      </h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                formatter={(value) => [formatCurrency(value), 'Cumulative sales']}
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
                dataKey="sales"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ fill: '#0f172a', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

export default SalesChart
