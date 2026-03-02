import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'wouter'

import { get, post, put, del } from '../../../../lib/client'
import { useSale } from '../../../../context'
import { Input, Select } from '../../../../components/inputs'
import { EmptyState, SlidePanel } from '../../../../components/shared'
import strings from '../../../../localization'
import Pagination from '../../../../components/tables/Pagination'
import * as XLSX from 'xlsx'

const LIMIT = 100

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getInitialForm = (guest, products = []) => {
  if (guest) {
    const productVal = guest.product ?? guest.productId ?? ''
    const productMatch = products.find(
      (p) => p.name === productVal || p.id === productVal || p.category === productVal
    )
    return {
      name: guest.name ?? '',
      email: guest.email ?? '',
      product: productMatch?.id ?? productVal ?? '',
      quantity: String(guest.count ?? 1),
    }
  }
  return {
    name: '',
    email: '',
    product: '',
    quantity: '1',
  }
}

const SaleGuests = () => {
  const { id } = useParams()
  const printRef = useRef(null)
  const { sale, products, isNew } = useSale()

  const [guests, setGuests] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [panelGuest, setPanelGuest] = useState(null)
  const [saving, setSaving] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const skip = (page - 1) * LIMIT
  const panelOpen = panelGuest !== null
  const isAdding = panelGuest === 'new'

  const fetchGuests = useCallback(() => {
    if (isNew) return
    setLoading(true)
    setError(null)
    get(`/sales/${id}/guests?limit=${LIMIT}&skip=${skip}`)
      .then((r) => {
        setGuests(r.data ?? [])
        setTotal(r.count ?? 0)
      })
      .catch((err) => setError(err?.message ?? strings('error.failedLoadGuests')))
      .finally(() => setLoading(false))
  }, [id, skip, isNew])

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setGuests([])
      setTotal(0)
      return
    }
    fetchGuests()
  }, [fetchGuests, isNew])

  const closePanel = useCallback(() => setPanelGuest(null), [])

  const handleSave = async (guest, payload) => {
    setSaving(guest?._id ?? guest?.id ?? 'new')
    setError(null)
    try {
      const guestId = guest?._id ?? guest?.id
      if (guestId) {
        await put(`/guests/${guestId}`, payload)
        setGuests((prev) =>
          prev.map((g) => {
            const gid = g._id ?? g.id
            if (gid !== guestId) return g
            return { ...g, ...payload }
          })
        )
        closePanel()
      } else {
        const res = await post(`/sales/${id}/guests`, payload)
        setGuests((prev) => [...prev, res.data ?? payload])
        setTotal((t) => t + 1)
        closePanel()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (guestId) => {
    if (!confirm(strings('form.guest.confirmDelete'))) return
    setDeleting(guestId)
    setError(null)
    try {
      await del(`/guests/${guestId}`)
      setGuests((prev) => prev.filter((g) => (g._id ?? g.id) !== guestId))
      setTotal((t) => Math.max(0, t - 1))
      closePanel()
    } catch (err) {
      setError(err?.message ?? strings('error.failedDeleteGuest'))
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && panelOpen) closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panelOpen, closePanel])

  const handlePrint = () => {
    if (!printRef.current) return
    const printContent = printRef.current.innerHTML
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strings('form.guest.printTitle', [sale?.name ?? strings('page.sale.title')])}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8">
          <h1 class="text-2xl font-bold mb-6">${strings('form.guest.printTitle', [sale?.name ?? strings('page.sale.title')])}</h1>
          <div class="guests-print">${printContent}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleDownloadExcel = () => {
    const headers = [strings('form.guest.tableName'), strings('form.guest.tableEmail'), strings('form.guest.tableProduct'), strings('form.guest.tableQuantity'), strings('form.guest.tableCreated')]
    const rows = guests.map((g) => [
      g.name ?? '',
      g.email ?? '',
      g.product ?? '',
      g.count ?? 0,
      formatDate(g.createdAt),
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Guests')
    const safeName = (sale?.name ?? id).replace(/[^a-zA-Z0-9-_]/g, '_')
    XLSX.writeFile(wb, `guests-${safeName}.xlsx`)
  }

  const totalQuantity = guests.reduce((sum, g) => sum + (g.count ?? 0), 0)

  if (loading && guests.length === 0 && !isNew) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (isNew) {
    return (
      <div className="relative">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">{strings('form.guest.title')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{strings('form.guest.saveFirstHint')}</p>
          </div>
          <EmptyState
            icon="fa-user-group"
            variant="amber"
            title={strings('form.guest.saveFirst')}
            description={strings('form.guest.noGuestsDescAlt')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-slate-900">{strings('form.guest.title')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {guests.length === 1 ? strings('form.guest.count', [guests.length]) : strings('form.guest.countPlural', [guests.length])}
              {totalQuantity > 0 && <> · {strings('form.guest.totalTickets', [totalQuantity])}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelGuest('new')}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              {strings('form.guest.addGuest')}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || guests.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label={strings('form.guest.ariaPrint')}
            >
              <i className="fa-solid fa-print" aria-hidden />
              {strings('form.guest.printPdf')}
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={loading || guests.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label={strings('form.guest.ariaDownload')}
            >
              <i className="fa-solid fa-file-excel" aria-hidden />
              {strings('form.guest.downloadExcel')}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {guests.length === 0 ? (
          <EmptyState
            icon="fa-user-group"
            title={strings('form.guest.noGuests')}
            description={strings('form.guest.noGuestsDesc')}
            action={
              <button
                type="button"
                onClick={() => setPanelGuest('new')}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                {strings('form.guest.addGuest')}
              </button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div ref={printRef} className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('form.guest.tableName')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('form.guest.tableEmail')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('form.guest.tableProduct')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('form.guest.tableQuantity')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('form.guest.tableCreated')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests.map((guest) => {
                    const gid = guest._id ?? guest.id
                    return (
                      <tr
                        key={gid}
                        tabIndex={0}
                        onClick={() => setPanelGuest(guest)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setPanelGuest(guest)
                          }
                        }}
                        className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                          {guest.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {guest.email ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {guest.product ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {guest.count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                          {formatDate(guest.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-slate-500" />
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {totalQuantity} {strings('form.guest.total')}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination
              total={total}
              limit={LIMIT}
              page={page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <SlidePanel
        isOpen={panelOpen}
        onClose={closePanel}
        aria-label={isAdding ? strings('form.guest.addGuest') : strings('form.guest.editGuest')}
      >
        <GuestPanel
          key={isAdding ? 'new' : panelGuest?._id ?? panelGuest?.id ?? 'edit'}
          guest={isAdding ? null : panelGuest}
          products={products}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closePanel}
          saving={saving}
          deleting={deleting}
        />
      </SlidePanel>
    </div>
  )
}

const GuestPanel = ({
  guest,
  products,
  onSave,
  onDelete,
  onClose,
  saving,
  deleting,
}) => {
  const isNew = guest === null
  const [form, setForm] = useState(() => getInitialForm(guest, products))

  useEffect(() => {
    setForm(getInitialForm(guest, products))
  }, [guest, products])

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const productId = form.product || (products[0]?.id ?? '')
    const productMatch = products.find((p) => p.id === productId)
    const payload = {
      name: form.name || undefined,
      email: form.email || undefined,
      product: productId || productMatch?.name || form.product,
      count: form.quantity ? Number(form.quantity) : 1,
    }
    onSave(guest, payload)
  }

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name ?? p.category ?? p.id,
  }))

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isNew ? strings('form.guest.newGuest') : guest?.name || strings('form.guest.editGuest')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label={strings('common.ariaClose')}
        >
          <i className="fa-solid fa-xmark text-lg" aria-hidden />
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {strings('common.details')}
              </h4>
              <Input
                label={strings('form.guest.guestName')}
                name="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={strings('common.name')}
              />
              <Input
                label={strings('form.guest.guestEmail')}
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder={strings('form.transaction.email')}
              />
              <Select
                label={strings('form.guest.ticketType')}
                name="product"
                value={form.product}
                onChange={(e) => update({ product: e.target.value })}
                placeholder={strings('form.guest.selectTicketType')}
                options={productOptions}
              />
              <Input
                label={strings('form.guest.ticketQuantity')}
                name="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => update({ quantity: e.target.value })}
                placeholder={strings('form.guest.tableQuantity')}
              />
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  {strings('common.saving')}
                </>
              ) : (
                <>{isNew ? strings('form.guest.createGuest') : strings('form.ticket.saveChanges')}</>
              )}
            </button>
            {isNew ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {strings('common.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDelete(guest?._id ?? guest?.id)}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                ) : (
                  strings('common.delete')
                )}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  )
}

export default SaleGuests
