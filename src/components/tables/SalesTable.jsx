import dayjs from 'dayjs'

const SalesTable = ({ data = [] }) => {
  const formatCurrency = (value) => `₺${Number(value).toLocaleString()}`
  const formatDate = (date) => dayjs(date).format('D MMM YYYY')

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Venue
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Views
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Reservations
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Revenue
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Start date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No sales yet
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id ?? row.name} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                  {row.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {row.venue}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">
                  {row.views?.toLocaleString() ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">
                  {row.reservations?.toLocaleString() ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {row.revenue != null ? formatCurrency(row.revenue) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {row.startDate ? formatDate(row.startDate) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default SalesTable
