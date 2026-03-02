import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'wouter'

import { get } from '../../../lib/client'
import strings from '../../../localization'
import Pagination from '../../../components/tables/Pagination'
import TransactionsTable from '../../../components/tables/TransactionsTable'
import SlidePanel from '../../../components/shared/SlidePanel'
import TransactionPanel from './Transaction'

const LIMIT = 25

const Transactions = () => {
  const [, setLocation] = useLocation()
  const { id } = useParams()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [fetchedPage, setFetchedPage] = useState(null)
  const [error, setError] = useState(null)

  const loading = fetchedPage !== page

  useEffect(() => {
    const skip = (page - 1) * LIMIT
    queueMicrotask(() => setError(null))
    get(`/transactions/search?limit=${LIMIT}&skip=${skip}&status=success`)
      .then((res) => {
        setData(res.data ?? [])
        setTotal(res.total ?? res.count ?? 0)
        setFetchedPage(page)
        setError(null)
      })
      .catch((err) => {
        setError(err?.message ?? strings('error.failedLoadTransactions'))
        setFetchedPage(page)
      })
  }, [page])

  if (error && data.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{strings('page.transactions.title')}</h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <TransactionsTable
          data={data}
          bare
          loading={loading}
          onRowClick={(row) => row.id && setLocation(`/transactions/${row.id}`)}
        />
        <Pagination
          total={total}
          limit={LIMIT}
          page={page}
          onPageChange={setPage}
        />
      </div>
      <SlidePanel
        isOpen={!!id}
        onClose={() => setLocation('/transactions')}
        title={strings('page.transactions.details')}
        aria-label="Transaction details"
      >
        {id && <TransactionPanel id={id} onClose={() => setLocation('/transactions')} />}
      </SlidePanel>
    </div>
  )
}

export default Transactions
