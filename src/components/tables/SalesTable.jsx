import dayjs from 'dayjs'

const SalesTable = ({ data = [], extended = false, onDelete }) => {
  const formatCurrency = (value) => `₺${Number(value).toLocaleString()}`
  const formatDate = (date) => dayjs(date).format('D MMM YYYY')

  const baseCols = 6
  const extendedCols = baseCols + (extended ? 3 : 0)
  const totalCols = extendedCols

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Start date
            </th>
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
            {extended && (
              <>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Delete
                </th>
                {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Created at
                </th> */}
                {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th> */}
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-4 py-8 text-center text-slate-500">
                No sales yet
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id ?? row.name} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {row.startDate ? formatDate(row.startDate) : '—'}
                </td>
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
                  {(row.revenue ?? row.sales) != null ? formatCurrency(row.revenue ?? row.sales) : '—'}
                </td>
                {extended && (
                  <>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                      {onDelete && row.id ? (
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 hover:bg-red-200 active:bg-red-300 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-red-300"
                          aria-label="Delete"
                          style={{ pointerEvents: 'auto' }}
                        >
                          Delete
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {(row.created_at ?? row.createdAt) ? formatDate(row.created_at ?? row.createdAt) : '—'}
                    </td> */}
                    {/* <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {row.status ?? '—'}
                    </td> */}
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default SalesTable
