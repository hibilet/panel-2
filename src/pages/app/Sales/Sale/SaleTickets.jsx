import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'wouter'

import { post, put, del } from '../../../../lib/client'
import { useSale } from '../../../../context'
import { Input, Select } from '../../../../components/inputs'
import { EmptyState, SlidePanel } from '../../../../components/shared'
import strings from '../../../../localization'

const formatPrice = (value, currency = 'eur') => {
  if (value == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value)
}

const getInitialForm = (product) => {
  if (product) {
    return {
      name: product.name ?? '',
      category: product.category ?? '',
      promo: product.promo ?? '',
      stock: String(product.stock ?? ''),
      productsToDeliver: String(product.productsToDeliver ?? ''),
      price: String(product.price ?? ''),
      status: product.status ?? 'active',
    }
  }
  return {
    name: '',
    category: '',
    promo: '',
    stock: '',
    productsToDeliver: '',
    price: '',
    status: 'active',
  }
}

const SaleTickets = () => {
  const { id } = useParams()
  const { products, setProducts, loading, isNew } = useSale()

  const [error, setError] = useState(null)
  const [panelProduct, setPanelProduct] = useState(null)
  const [saving, setSaving] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const panelOpen = panelProduct !== null
  const isAdding = panelProduct === 'new'

  const closePanel = useCallback(() => setPanelProduct(null), [])

  const handleSave = async (product, payload) => {
    setSaving(product?.id ?? 'new')
    setError(null)
    try {
      if (product?.id) {
        await put(`/products/${product.id}`, payload)
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...payload } : p))
        )
        closePanel()
      } else {
        const res = await post(`/sales/${id}/products`, payload)
        setProducts((prev) => [...prev, res.data])
        closePanel()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm(strings('confirm.deleteTicket'))) return
    setDeleting(productId)
    setError(null)
    try {
      await del(`/products/${productId}`)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      closePanel()
    } catch (err) {
      setError(err?.message ?? strings('error.failedDelete'))
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

  const totals = products.reduce(
    (acc, p) => ({
      stock: acc.stock + (p.stock ?? 0),
      reserved: acc.reserved + (p.reservations ?? 0),
      read: acc.read + (p.read ?? 0),
    }),
    { stock: 0, reserved: 0, read: 0 }
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-slate-900">{strings('form.ticket.ticketTypes')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {products.length === 1 ? strings('form.ticket.ticketTypeCount', [products.length]) : strings('form.ticket.ticketTypeCountPlural', [products.length])}
              {totals.stock > 0 && <> · {strings('form.ticket.totalCapacity', [totals.stock])}</>}
            </p>
          </div>
          {!isNew && (
            <button
              type="button"
              onClick={() => setPanelProduct('new')}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              {strings('form.ticket.addTicketType')}
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {isNew ? (
          <EmptyState
            icon="fa-ticket"
            variant="amber"
            title={strings('form.ticket.saveFirst')}
            description={strings('form.ticket.saveFirstDesc')}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon="fa-ticket"
            title={strings('form.ticket.noTicketTypes')}
            description={strings('form.ticket.noTicketTypesDesc')}
            action={
              <button
                type="button"
                onClick={() => setPanelProduct('new')}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                {strings('form.ticket.addTicketType')}
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.category')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.price')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.stock')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.reservations')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      {strings('table.ticket.status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      tabIndex={0}
                      onClick={() => setPanelProduct(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setPanelProduct(product)
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {product.name || strings('common.untitled')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {product.category ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {formatPrice(product.price)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">
                        {product.stock ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-600">
                        {product.reservations ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {product.status === 'active' ? strings('common.active') : strings('common.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totals.stock > 0 && (
              <div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm">
                <span className="font-medium text-slate-700">
                  {strings('form.ticket.totalCapacityLabel', [totals.stock])}
                </span>
                <span className="text-slate-600">
                  {strings('form.ticket.reservationsLabel', [totals.reserved])}
                </span>
                <span className="text-slate-600">{strings('form.ticket.readLabel', [totals.read])}</span>
              </div>
            )}
          </>
        )}
      </div>

      <SlidePanel
        isOpen={panelOpen}
        onClose={closePanel}
        title={isAdding ? strings('form.ticket.addTicketTypePanel') : strings('form.ticket.editTicketTypePanel')}
      >
        <ProductPanel
          key={isAdding ? 'new' : panelProduct?.id ?? 'edit'}
          product={isAdding ? null : panelProduct}
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

const ProductPanel = ({
  product,
  onSave,
  onDelete,
  onClose,
  saving,
  deleting,
}) => {
  const isNew = product === null
  const [form, setForm] = useState(() => getInitialForm(product))

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name || undefined,
      category: form.category || undefined,
      promo: form.promo || undefined,
      stock: form.stock ? Number(form.stock) : undefined,
      productsToDeliver: form.productsToDeliver
        ? Number(form.productsToDeliver)
        : undefined,
      price: form.price ? Number(form.price) : undefined,
      status: form.status || 'active',
    }
    onSave(product, payload)
  }

  const hasReservations = (product?.reservations ?? 0) > 0
  const seatCount = product?.stock ?? 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isNew ? strings('form.ticket.newTicketType') : product?.name || strings('form.ticket.editTicket')}
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
                label={strings('common.name')}
                name="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={strings('form.ticket.namePlaceholder')}
              />
              <Input
                label={strings('table.ticket.category')}
                name="category"
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                placeholder={strings('form.ticket.categoryPlaceholder')}
              />
              <Input
                label={strings('form.ticket.promoText')}
                name="promo"
                value={form.promo}
                onChange={(e) => update({ promo: e.target.value })}
                placeholder={strings('form.ticket.promoPlaceholder')}
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {strings('form.ticket.capacityPricing')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={strings('table.ticket.stock')}
                  name="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => update({ stock: e.target.value })}
                  placeholder={strings('form.ticket.stockPlaceholder')}
                />
                <Input
                  label={strings('form.ticket.ticketsToDeliver')}
                  name="productsToDeliver"
                  type="number"
                  value={form.productsToDeliver}
                  onChange={(e) => update({ productsToDeliver: e.target.value })}
                  placeholder="1"
                />
              </div>
              <Input
                label={strings('table.ticket.price')}
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder={strings('form.ticket.pricePlaceholder')}
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {strings('common.status')}
              </h4>
              <Select
                label={strings('form.ticket.visibility')}
                name="status"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
                options={[
                  { value: 'active', label: strings('form.ticket.visibilityActive') },
                  { value: 'inactive', label: strings('form.ticket.visibilityInactive') },
                ]}
              />
            </div>

            {product && seatCount > 0 && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <i className="fa-solid fa-armchair" aria-hidden />
                {strings('form.ticket.selectSeats', [seatCount])}
              </button>
            )}
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
                <>{isNew ? strings('form.ticket.createTicketType') : strings('form.ticket.saveChanges')}</>
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
                onClick={() => onDelete(product.id)}
                disabled={deleting || hasReservations}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={hasReservations ? strings('form.ticket.cannotDeleteReservations') : strings('common.delete')}
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

export default SaleTickets
