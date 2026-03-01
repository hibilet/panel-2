import dayjs from 'dayjs'

// weekday 1 = Mon, 2 = Tue, ..., 6 = Sat, 7 = Sun (dayjs: 0=Sun, 1=Mon, ..., 6=Sat)
const WEEKDAY_DAYJS = [1, 2, 3, 4, 5, 6, 0]

const WeeklyEventSaleMatrix = ({ data = [] }) => {
  const formatCurrency = (value) =>
    value != null ? `₺${Number(value).toLocaleString()}` : '—'

  const weekdayLabels = WEEKDAY_DAYJS.map((d) => dayjs().day(d).format('ddd'))

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Event name
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
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={WEEKDAY_DAYJS.length + 1}
                className="px-4 py-8 text-center text-slate-500"
              >
                No events yet
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.eventName ?? row.id} className="hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                  {row.eventName}
                </td>
                {WEEKDAY_DAYJS.map((d, i) => (
                  <td
                    key={d}
                    className="whitespace-nowrap px-4 py-3 text-center text-sm text-slate-600"
                  >
                    {formatCurrency(row[`weekday${i + 1}`] ?? row[`weekday_${i + 1}`])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default WeeklyEventSaleMatrix
