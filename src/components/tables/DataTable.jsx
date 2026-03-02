import strings from '../../localization'

const TH_CLASS = 'px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500'
const TH_CLASS_RIGHT = 'text-right'
const TH_CLASS_LEFT = 'text-left'
const TD_CLASS = 'px-4 py-3 text-sm'
const TD_CLASS_MEDIUM = 'font-medium text-slate-900'
const TD_CLASS_MUTED = 'text-slate-600'
const ROW_CLASS = 'border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400'
const ROW_CLASS_STATIC = 'border-b border-slate-100'
const DARK_TH = 'dark:text-slate-400'
const DARK_TD = 'dark:text-slate-300'
const DARK_ROW = 'dark:border-slate-700 dark:hover:bg-slate-700/50'
const DARK_THEAD = 'dark:bg-slate-800/50'
const DARK_TBODY = 'dark:bg-slate-800'

/**
 * Generic data table with configurable columns.
 * @param {Object} props
 * @param {Array} props.data - Row data
 * @param {Array} props.columns - [{ key, header, render?, align?, className?, headerCell?, printOnly? }]
 * @param {Function} props.getRowKey - (row) => key
 * @param {Function} props.onRowClick - (row) => void
 * @param {boolean} props.loading
 * @param {boolean} props.bare - No wrapper (rounded border shadow)
 * @param {boolean} props.dark - Dark mode styling
 * @param {React.ReactNode} props.emptyMessage
 * @param {React.ReactNode} props.footer
 * @param {string} props.minWidth - e.g. 'min-w-[640px]'
 * @param {Object} props.tableRef - ref for print area
 * @param {number} props.shimmerRows - Rows to show when loading
 */
const DataTable = ({
  data = [],
  columns = [],
  getRowKey = (row) => row.id ?? row._id,
  onRowClick,
  loading = false,
  bare = false,
  dark = false,
  emptyMessage = strings('common.noData'),
  footer,
  minWidth = 'min-w-full',
  tableRef,
  shimmerRows = 5,
  className = '',
}) => {
  const showLoading = loading && data.length === 0
  const darkCls = dark ? ' dark' : ''

  if (showLoading) {
    const wrapperClass = bare
      ? 'overflow-x-auto'
      : 'overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800'
    return (
      <div className={wrapperClass}>
        <table className={`w-full divide-y divide-slate-200 dark:divide-slate-700 ${minWidth}`}>
          <thead className={`bg-slate-50 ${dark ? DARK_THEAD : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${TH_CLASS} ${col.align === 'right' ? TH_CLASS_RIGHT : TH_CLASS_LEFT} ${dark ? DARK_TH : ''} ${col.printOnly ? 'print-only hidden' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-200 bg-white ${dark ? DARK_TBODY : ''}`}>
            {Array.from({ length: shimmerRows }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${TD_CLASS} ${col.align === 'right' ? 'text-right' : ''} ${col.printOnly ? 'print-only hidden' : ''}`}
                  >
                    <div className={`h-4 animate-shimmer rounded ${col.shimmerWidth ?? 'w-24'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const tableEl = (
    <table className={`w-full border-collapse divide-y divide-slate-200 dark:divide-slate-700 ${minWidth}`}>
      <thead className={`bg-slate-50 ${dark ? DARK_THEAD : ''}`}>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`${TH_CLASS} ${col.align === 'right' ? TH_CLASS_RIGHT : TH_CLASS_LEFT} ${dark ? DARK_TH : ''} ${col.printOnly ? 'print-only hidden' : ''}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={`divide-y divide-slate-100 bg-white ${dark ? DARK_TBODY : ''}`}>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
              className={`${onRowClick ? ROW_CLASS : ROW_CLASS_STATIC} ${dark ? DARK_ROW : ''}`}
            >
              {columns.map((col) => {
                const content = col.render ? col.render(row) : row[col.key] ?? '—'
                const isTh = col.headerCell
                const Tag = isTh ? 'th' : 'td'
                return (
                  <Tag
                    key={col.key}
                    scope={isTh ? 'row' : undefined}
                    className={`whitespace-nowrap ${TD_CLASS} ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${isTh ? `${TD_CLASS_MEDIUM} ${dark ? 'dark:text-white' : ''}` : TD_CLASS_MUTED} ${
                      dark ? DARK_TD : ''
                    } ${col.printOnly ? 'print-only hidden' : ''} ${col.className ?? ''}`}
                  >
                    {content}
                  </Tag>
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
  )

  const wrapperClass = bare
    ? `overflow-x-auto ${className}`.trim()
    : `overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`.trim()

  return (
    <div ref={tableRef} className={wrapperClass}>
      {tableEl}
    </div>
  )
}

export default DataTable
