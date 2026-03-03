import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'

import { get } from '../../../lib/client'
import strings from '../../../localization'
import Pagination from '../../../components/tables/Pagination'
import DataTable from '../../../components/tables/DataTable'
import { accountsColumns } from '../../../components/tables/columns'
import { Modal } from '../../../components/shared'

const LIMIT = 10

const Accounts = () => {
  const [, setLocation] = useLocation()
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [fetchedPage, setFetchedPage] = useState(null)
  const [error, setError] = useState(null)
  const [filterEmail, setFilterEmail] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)

  const loading = fetchedPage !== page

  useEffect(() => {
    const skip = (page - 1) * LIMIT
    const params = new URLSearchParams({ limit: String(LIMIT), skip: String(skip) })
    if (filterEmail?.trim()) params.set('email', filterEmail.trim())
    if (filterType?.trim()) params.set('type', filterType.trim())
    queueMicrotask(() => setError(null))
    get(`/accounts/search?${params}`)
      .then((res) => {
        setData(res.data ?? [])
        setTotal(res.total ?? res.count ?? 0)
        setFetchedPage(page)
        setError(null)
      })
      .catch((err) => {
        setError(err?.message ?? strings('error.failedLoadAccounts'))
        setFetchedPage(page)
      })
  }, [page, filterEmail, filterType])

  if (error && data.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    )
  }

  const closeFilterDialog = () => setFilterDialogOpen(false)

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    const form = e.target
    setFilterEmail(form.email?.value?.trim() ?? '')
    setFilterType(form.type?.value?.trim() ?? '')
    setPage(1)
    closeFilterDialog()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{strings('page.accounts.title')}</h1>
        <button
          type="button"
          onClick={() => setFilterDialogOpen(true)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          🔍 {strings('page.accounts.filter')}
        </button>
      </div>
      <Modal
        isOpen={filterDialogOpen}
        onClose={closeFilterDialog}
        title={strings('page.accounts.filterAccounts')}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeFilterDialog}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ❌ {strings('common.cancel')}
            </button>
            <button
              type="submit"
              form="filter-accounts-form"
              className="rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              🔍 {strings('page.accounts.filter')}
            </button>
          </div>
        }
      >
        <form id="filter-accounts-form" onSubmit={handleFilterSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{strings('page.accounts.email')}</span>
            <input
              name="email"
              type="text"
              placeholder={strings('page.accounts.emailPlaceholder')}
              defaultValue={filterEmail}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{strings('page.accounts.type')}</span>
            <select
              name="type"
              defaultValue={filterType}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">{strings('page.accounts.typeAll')}</option>
              <option value="merchant">{strings('page.accounts.typeMerchant')}</option>
              <option value="user">{strings('page.accounts.typeUser')}</option>
            </select>
          </label>
        </form>
      </Modal>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          data={data}
          columns={accountsColumns}
          getRowKey={(r) => r.id}
          bare
          loading={loading}
          onRowClick={(row) => row.id && setLocation(`/accounts/${row.id}`)}
          emptyMessage={strings('table.account.noAccounts')}
        />
        <Pagination
          total={total}
          limit={LIMIT}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default Accounts
