import dayjs from 'dayjs'
import strings, { formatCurrency } from '../../localization'

// weekday 1 = Mon, 2 = Tue, ..., 6 = Sat, 7 = Sun (dayjs: 0=Sun, 1=Mon, ..., 6=Sat)
const WEEKDAY_DAYJS = [1, 2, 3, 4, 5, 6, 0]

const formatCurrencyOrDash = (value) =>
  value != null ? formatCurrency(value) : '—'

const formatCount = (value) =>
  value != null ? Number(value).toLocaleString() : '—'

const WeeklyEventSaleMatrix = ({ data = [], valueFormat = 'currency', loading = false }) => {
  const formatCell = valueFormat === 'count' ? formatCount : formatCurrencyOrDash

  const weekdayLabels = WEEKDAY_DAYJS.map((d) => dayjs().day(d).format('ddd'))
  const showShimmer = loading || data.length === 0

  if (showShimmer) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                {strings('table.weekly.eventName')}
              </th>
              {WEEKDAY_DAYJS.map((d, i) => (
                <th key={d} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  {weekdayLabels[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {[1, 2, 3, 4].map((i) => (
              <tr key={i}>
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="h-4 w-48 animate-shimmer rounded" />
                </td>
                {WEEKDAY_DAYJS.map((d) => (
                  <td key={d} className="px-4 py-3 text-center">
                    <div className="mx-auto h-4 w-12 animate-shimmer rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {strings('table.weekly.eventName')}
            </th>
            {WEEKDAY_DAYJS.map((d, i) => (
              <th
                key={d}
                className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500"
              >
                {weekdayLabels[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((row) => (
              <tr key={row.eventName ?? row.id} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                  {row.eventName}
                </td>
                {WEEKDAY_DAYJS.map((d, i) => (
                  <td
                    key={d}
                    className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600"
                  >
                    {formatCell(row[`weekday${i + 1}`] ?? row[`weekday_${i + 1}`])}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default WeeklyEventSaleMatrix
