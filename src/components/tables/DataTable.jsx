/**
 * Generic data table with configurable columns.
 * @param {Object} props
 * @param {Array} props.data - Row data
 * @param {Array} props.columns - [{ key, header, render?, align?, className?, printOnly? }]
 * @param {Function} props.getRowKey - (row) => key
 * @param {Function} props.onRowClick - (row) => void
 * @param {boolean} props.loading
 * @param {React.ReactNode} props.emptyMessage
 * @param {React.ReactNode} props.footer
 * @param {string} props.minWidth - e.g. 'min-w-[640px]'
 * @param {Object} props.tableRef - ref for print area
 */
const DataTable = ({
  data = [],
  columns = [],
  getRowKey = (row) => row.id ?? row._id,
  onRowClick,
  loading = false,
  emptyMessage = 'No data',
  footer,
  minWidth = 'min-w-[640px]',
  tableRef,
  className = '',
}) => {
  const showLoading = loading && data.length === 0

  if (showLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  return (
    <div ref={tableRef} className={`overflow-auto ${className}`}>
      <table className={`w-full border-collapse ${minWidth}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.printOnly ? 'print-only hidden' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={getRowKey(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => {
                  const Cell = col.headerCell ? 'th' : 'td'
                  const content = col.render ? col.render(row) : row[col.key] ?? '—'
                  return (
                    <Cell
                      key={col.key}
                      scope={col.headerCell ? 'row' : undefined}
                      className={`px-4 py-3 text-sm ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.headerCell ? 'font-medium text-slate-900' : 'text-slate-600'} ${
                        col.printOnly ? 'print-only hidden' : ''
                      } ${col.className ?? ''}`}
                    >
                      {content}
                    </Cell>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr>{footer}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default DataTable
