import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import dayjs from 'dayjs'

import { get } from '../../../../lib/client'
import strings from '../../../../localization'
import SlidePanel from '../../../../components/shared/SlidePanel'
import AgreementPanel from './Agreement'

const formatDate = (date) => (date ? dayjs(date).format('D MMM YYYY, HH:mm') : '—')

const formatType = (type) => {
  if (!type) return '—'
  return String(type).charAt(0).toUpperCase() + String(type).slice(1)
}

const Agreements = () => {
  const [, setLocation] = useLocation()
  const { id } = useParams()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAgreements = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    get('/agreements')
      .then((res) => setData(res.data ?? []))
      .catch((err) => !silent && setError(err?.message ?? strings('error.failedLoadAgreements')))
      .finally(() => !silent && setLoading(false))
  }, [])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  if (error && !loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <i className="fa-solid fa-arrow-left" aria-hidden />
          {strings('back.settings')}
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <i className="fa-solid fa-arrow-left" aria-hidden />
        {strings('back.settings')}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
          <i className="fa-solid fa-file-contract text-slate-600 dark:text-slate-400" aria-hidden />
          {strings('page.settings.salesAgreements')}
        </h1>
        <button
          type="button"
          onClick={() => setLocation('/settings/agreements/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <i className="fa-solid fa-plus" aria-hidden />
          {strings('page.settings.createNewAgreement')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-slate-500 dark:text-slate-400">
            {strings('table.agreement.noAgreements')}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {strings('table.agreement.name')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {strings('table.agreement.type')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {strings('table.agreement.createdAt')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
              {data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => row.id && setLocation(`/settings/agreements/${row.id}`)}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {row.name ?? '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {formatType(row.type)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SlidePanel
        isOpen={!!id}
        onClose={() => setLocation('/settings/agreements')}
        title={id === 'new' ? strings('form.agreement.newTitle') : strings('form.agreement.editTitle')}
        aria-label={id === 'new' ? strings('form.agreement.newTitle') : strings('form.agreement.editTitle')}
      >
        {id && (
          <AgreementPanel
            id={id}
            onClose={() => setLocation('/settings/agreements')}
            onSaved={(newId) => {
              fetchAgreements(true)
              if (newId) setLocation(`/settings/agreements/${newId}`)
            }}
          />
        )}
      </SlidePanel>
    </div>
  )
}

export default Agreements
