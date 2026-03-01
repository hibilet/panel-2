import { useEffect, useState } from 'react'
import { Link } from 'wouter'

import { get, del } from '../../../lib/client'
import SalesTable from '../../../components/tables/SalesTable'

const mapRows = (rows) =>
  (rows ?? []).map((row) => ({
    ...row,
    startDate: row.start ?? row.startDate,
  }))

const Sales = () => {
  const [sales, setSales] = useState([])
  const [pastSales, setPastSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [pastLoading, setPastLoading] = useState(false)
  const [pastFetched, setPastFetched] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [error, setError] = useState(null)
  const [pastError, setPastError] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [revenueMode, setRevenueMode] = useState(false)

  useEffect(() => {
    setLoading(true)
    const qs = revenueMode ? '?revenue=true' : ''
    get(`/sales${qs}`)
      .then((res) => setSales(mapRows(res.data)))
      .catch((err) => setError(err?.message ?? 'Failed to load sales'))
      .finally(() => setLoading(false))
  }, [revenueMode])

  const handleViewPastEvents = () => {
    const next = !showPastEvents
    setShowPastEvents(next)
    if (next && !pastFetched) {
      setPastFetched(true)
      setPastLoading(true)
      get('/sales?past=true&revenue=true')
        .then((res) => setPastSales(mapRows(res.data)))
        .catch((err) => setPastError(err?.message ?? 'Failed to load past events'))
        .finally(() => setPastLoading(false))
    }
  }

  const handleCalculateRevenues = () => setRevenueMode(true)

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return
    del(`/sales/${id}`)
      .then(() => setSales((prev) => prev.filter((r) => r.id !== id)))
      .catch((err) => setError(err?.message ?? 'Failed to delete'))
  }

  if (loading && sales.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      </div>
    )
  }

  if (error && sales.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Sales</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Show More
          </button>
          <button
            type="button"
            onClick={handleCalculateRevenues}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Calculate revenues
          </button>
          <Link
            href="/sales/new"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Create New Sale
          </Link>
        </div>
      </div>

      <SalesTable
        data={sales}
        extended={showMore}
        onDelete={showMore ? handleDelete : undefined}
      />

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleViewPastEvents}
          className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {showPastEvents ? 'Hide Past Events' : 'View Past Events'}
        </button>
        {showPastEvents && (
          <>
            {pastLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Loading past events…
              </div>
            ) : pastError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
                {pastError}
              </div>
            ) : (
              <SalesTable data={pastSales} extended={false} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Sales
