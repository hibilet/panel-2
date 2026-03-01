const LinksTable = ({ data = [] }) => {
  const formatCurrency = (value) => `₺${Number(value).toLocaleString()}`

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Image
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Slug
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Reservations
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No links yet
              </td>
            </tr>
          ) : (
            data.map((row) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default LinksTable
