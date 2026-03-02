import { useState, useEffect } from 'react'

import { get } from '../../../../lib/client'
import dayjs from 'dayjs'
import strings, { formatCurrency } from '../../../../localization'

const STATUS_LABELS = {
  success: strings('status.success'),
  pending: strings('status.pending'),
  failed: strings('status.failed'),
  refunded: strings('status.refunded'),
}

const STATUS_STYLES = {
  success: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-slate-100 text-slate-600',
}

const TransactionPanel = ({ id, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    get(`/transactions/${id}`)
      .then((res) => setData(res.data ?? null))
      .catch((err) => setError(err?.message ?? strings('error.failedLoadTransaction')))
      .finally(() => setLoading(false))
  }, [id])

  const handleSendEmailAgain = () => {
    setSending(true)
    // TODO: wire to actual API when available
    setTimeout(() => setSending(false), 800)
  }

  const handleSendToAnotherEmail = () => {
    setEmailAddress(data?.owner?.email ?? '')
    setEmailDialogOpen(true)
  }

  const handleSubmitAnotherEmail = (e) => {
    e.preventDefault()
    setSending(true)
    // TODO: wire to actual API when available
    setTimeout(() => {
      setSending(false)
      setEmailDialogOpen(false)
    }, 800)
  }

  const handleCancelAll = () => {
    if (!window.confirm(strings('confirm.cancelAllReservations'))) return
    // TODO: wire to actual API when available
  }

  const handleCancelReservation = (reservation) => (e) => {
    e.stopPropagation()
    if (!window.confirm(strings('confirm.cancelReservation', [reservation.name]))) return
    // TODO: wire to actual API when available
  }

  const reservations = data?.reservations ?? []

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{strings('page.transactions.details')}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={strings('common.ariaClose')}
        >
          <i className="fa-solid fa-xmark text-xl" aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendEmailAgain}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {sending ? (
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  ) : (
                    <i className="fa-solid fa-envelope" aria-hidden />
                  )}
                  {strings('form.transaction.sendEmailAgain')}
                </button>
                <button
                  type="button"
                  onClick={handleSendToAnotherEmail}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <i className="fa-solid fa-envelope-circle-check" aria-hidden />
                  {strings('form.transaction.sendToAnotherMail')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAll}
                  disabled={sending || reservations.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <i className="fa-solid fa-ban" aria-hidden />
                  {strings('form.transaction.cancelAll')}
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{strings('form.transaction.reservations')}</h3>
              {reservations.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  {strings('form.transaction.noReservations')}
                </p>
              ) : (
                <div className="grid gap-3">
                  {reservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{r.name ?? r.category ?? '—'}</p>
                          {r.category && r.category !== r.name && (
                            <p className="text-sm text-slate-500">{r.category}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 text-sm text-slate-600">
                        <span>{r.price != null ? formatCurrency(r.price, data?.sale?.currency ?? 'eur') : '—'}</span>
                        <span>{r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY, HH:mm') : '—'}</span>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={handleCancelReservation(r)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          {strings('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <code className="block max-h-64 overflow-auto whitespace-pre rounded-lg border border-slate-200 bg-slate-100 p-4 text-xs text-slate-700">
              {JSON.stringify(
                {
                  owner: data.owner,
                  sale: data.sale,
                  status: data.status,
                  conversation: data.conversation,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  billing: data.billing,
                  basket: data.basket,
                  reservations: data.reservations,
                  venue: data.venue,
                  id: data.id,
                },
                null,
                2
              )}
            </code>
          </div>
        ) : null}
      </div>

      {emailDialogOpen && (
        <SendEmailDialog
          email={emailAddress}
          onEmailChange={setEmailAddress}
          onClose={() => setEmailDialogOpen(false)}
          onSubmit={handleSubmitAnotherEmail}
          sending={sending}
        />
      )}
    </div>
  )
}

const SendEmailDialog = ({ email, onEmailChange, onClose, onSubmit, sending }) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-dialog-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <article className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id="send-email-dialog-title" className="text-lg font-semibold text-slate-900">
            {strings('form.transaction.sendToAnotherAddress')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={strings('common.ariaClose')}
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden />
          </button>
        </header>
        <form id="send-email-form" onSubmit={onSubmit} className="p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{strings('form.transaction.email')}</span>
            <input
              type="email"
              name="emailAddress"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Eg: john@doe.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>
        </form>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {strings('common.cancel')}
          </button>
          <button
            type="submit"
            form="send-email-form"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? (
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            ) : (
              <i className="fa-solid fa-envelope" aria-hidden />
            )}
            {strings('form.transaction.sendEmail')}
          </button>
        </footer>
      </article>
    </div>
  )
}

export default TransactionPanel
