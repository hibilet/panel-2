const Pagination = ({ total, limit, page, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const end = Math.min(currentPage * limit, total)

  const goTo = (p) => {
    const next = Math.max(1, Math.min(p, totalPages))
    if (next !== currentPage) onPageChange(next)
  }

  const showNav = totalPages > 1 || total > limit

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{start}</span> to{' '}
        <span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      {showNav && (
      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(1)}
          disabled={!hasPrev}
          className="rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="First page"
        >
          ««
        </button>
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={!hasPrev}
          className="rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous page"
        >
          «
        </button>
        <span className="px-2 py-1.5 text-sm text-slate-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={!hasNext}
          className="rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next page"
        >
          »
        </button>
        <button
          type="button"
          onClick={() => goTo(totalPages)}
          disabled={!hasNext}
          className="rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Last page"
        >
          »»
        </button>
      </nav>
      )}
    </div>
  )
}

export default Pagination
