import strings, { formatCurrency } from '../../localization'

const LinksTable = ({ data = [], loading = false }) => {
  const showShimmer = loading || data.length === 0

  if (showShimmer) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{strings('table.link.image')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{strings('table.link.title')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{strings('table.link.slug')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">{strings('table.link.reservations')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">{strings('table.link.revenue')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-10 w-10 animate-shimmer rounded-lg" /></td>
                <td className="px-4 py-3"><div className="h-4 w-36 animate-shimmer rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 animate-shimmer rounded font-mono" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-16 animate-shimmer rounded" /></td>
                <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-24 animate-shimmer rounded" /></td>
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
              {strings('table.link.image')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {strings('table.link.title')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              {strings('table.link.slug')}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              {strings('table.link.reservations')}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              {strings('table.link.revenue')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((row) => (
              <tr key={row.id ?? row.slug} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">
                  {row.image ? (
                    <img
                      src={row.image}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <i className="fa-solid fa-image text-sm" aria-hidden />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {row.title}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-600">
                  {row.slug}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">
                  {row.reservations?.toLocaleString() ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">
                  {row.revenue != null ? formatCurrency(row.revenue) : '—'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default LinksTable
