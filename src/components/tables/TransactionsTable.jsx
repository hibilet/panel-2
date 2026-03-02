import dayjs from 'dayjs'

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  success: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-slate-100 text-slate-600',
}

const TransactionsTable = ({ data = [], bare = false, loading = false, onRowClick }) => {
  const formatCurrency = (value) => `₺${Number(value).toLocaleString()}`
  const formatDate = (date) => dayjs(date).format('D MMM YYYY, HH:mm')

  const showShimmer = loading || data.length === 0

  if (showShimmer) {
    const shimmerRows = (
      <tbody className="divide-y divide-slate-200 bg-white">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            <td className="px-4 py-3"><div className="h-4 w-20 animate-shimmer rounded font-mono" /></td>
            <td className="px-4 py-3"><div className="h-4 w-36 animate-shimmer rounded" /></td>
            <td className="px-4 py-3"><div className="h-4 w-24 animate-shimmer rounded" /></td>
            <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-24 animate-shimmer rounded" /></td>
            <td className="px-4 py-3"><div className="h-4 w-36 animate-shimmer rounded" /></td>
            <td className="px-4 py-3"><div className="h-5 w-20 animate-shimmer rounded-full" /></td>
          </tr>
        ))}
      </tbody>
    )
    const loadingTable = (
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Owner</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Subtotal</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created at</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        {shimmerRows}
      </table>
    )
    if (bare) {
      return <div className="overflow-x-auto">{loadingTable}</div>
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loadingTable}
      </div>
    )
  }

  const table = (
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Owner
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Subtotal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Created at
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No transactions yet
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-600">
                  {row.id.slice(-8)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {row.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {row.owner ?? row.sale ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {(row.paid ?? row.subtotal) != null ? formatCurrency(row.paid ?? row.subtotal) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {row.createdAt ? formatDate(row.createdAt) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusStyles[row.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.status ?? '—'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
  )

  if (bare) {
    return <div className="overflow-x-auto">{table}</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      {table}
    </div>
  )
}

export default TransactionsTable
