import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'

import { get, del } from '../../../lib/client'
import strings from '../../../localization'
import { useApp } from '../../../context'
import SalesTable from '../../../components/tables/SalesTable'

const mapRows = (rows) =>
  (rows ?? []).map((row) => ({
    ...row,
    startDate: row.start ?? row.startDate,
  }))

const Sales = () => {
  const [, setLocation] = useLocation()
  const { sales, loading, error: appError, refreshSales } = useApp()

  const [pastSales, setPastSales] = useState([])
  const [pastLoading, setPastLoading] = useState(false)
  const [pastFetched, setPastFetched] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [pastError, setPastError] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [revenueMode, setRevenueMode] = useState(false)

  useEffect(() => {
    if (revenueMode) refreshSales({ revenue: true })
  }, [revenueMode, refreshSales])

  const handleViewPastEvents = () => {
    const next = !showPastEvents
    setShowPastEvents(next)
    if (next && !pastFetched) {
      setPastFetched(true)
      setPastLoading(true)
      get('/sales?past=true&revenue=true')
        .then((res) => setPastSales(mapRows(res.data)))
        .catch((err) => setPastError(err?.message ?? strings('error.failedLoadPastEvents')))
        .finally(() => setPastLoading(false))
    }
  }

  const handleCalculateRevenues = () => setRevenueMode(true)

  const handleDelete = (id) => {
    if (!window.confirm(strings('confirm.deleteSale'))) return
    del(`/sales/${id}`)
      .then(() => refreshSales({ revenue: revenueMode }))
      .catch(() => {})
  }

  if (appError && sales.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {appError}
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
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showMore ? strings('page.sales.showLess') : strings('page.sales.showMore')}
          </button>
          <button
            type="button"
            onClick={handleCalculateRevenues}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Calculate revenues
          </button>
          <Link
            href="/sales/new"
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            {strings('page.sales.createNew')}
          </Link>
        </div>
      </div>

      <SalesTable
        data={sales}
        extended={showMore}
        onDelete={showMore ? handleDelete : undefined}
        onRowClick={(row) => row.id && setLocation(`/sales/${row.id}`)}
        loading={loading}
      />

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleViewPastEvents}
          className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {showPastEvents ? strings('page.sales.hidePastEvents') : strings('page.sales.viewPastEvents')}
        </button>
        {showPastEvents && (
          <>
            {pastError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
                {pastError}
              </div>
            ) : (
              <SalesTable
                data={pastSales}
                extended={false}
                onRowClick={(row) => row.id && setLocation(`/sales/${row.id}`)}
                loading={pastLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Sales
