import dayjs from 'dayjs'

const SalesTable = ({ data = [], extended = false, onDelete, onRowClick, loading = false }) => {
  const formatCurrency = (value) => `₺${Number(value).toLocaleString()}`
  const formatDate = (date) => dayjs(date).format('D MMM YYYY')

  const baseCols = 6
  const extendedCols = baseCols + (extended ? 3 : 0)
  const totalCols = extendedCols
  const showShimmer = loading || data.length === 0

  if (showShimmer) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Start date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Venue</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Views</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Reservations</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</th>
              {extended && <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Delete</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 w-24 animate-shimmer rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-40 animate-shimmer rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 animate-shimmer rounded" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-16 animate-shimmer rounded" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-16 animate-shimmer rounded" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-24 animate-shimmer rounded" /></td>
                {extended && <td className="px-4 py-3"><div className="mx-auto h-5 w-14 animate-shimmer rounded-full" /></td>}
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
          {data.map((row) => (
              <tr
                key={row.id ?? row.name}
                role={onRowClick && row.id ? 'button' : undefined}
                tabIndex={onRowClick && row.id ? 0 : undefined}
                onClick={onRowClick && row.id ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick && row.id ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                className={`hover:bg-slate-50 ${onRowClick && row.id ? 'cursor-pointer' : ''}`}
              >
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
                          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
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
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default SalesTable
