import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'wouter'

import { post, put, del } from '../../../../lib/client'
import { useSale } from '../../../../context'
import { Input, Select } from '../../../../components/inputs'
import { EmptyState, SlidePanel } from '../../../../components/shared'

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
      setError(err?.message ?? 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Delete this ticket type?')) return
    setDeleting(productId)
    setError(null)
    try {
      await del(`/products/${productId}`)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      closePanel()
    } catch (err) {
      setError(err?.message ?? 'Failed to delete')
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
            <h2 className="text-lg font-medium text-slate-900">Ticket types</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {products.length} ticket type{products.length !== 1 ? 's' : ''}
              {totals.stock > 0 && <> · {totals.stock} total capacity</>}
            </p>
          </div>
          {!isNew && (
            <button
              type="button"
              onClick={() => setPanelProduct('new')}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              Add ticket type
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
            title="Save the sale first"
            description="Create and save the sale to add ticket types."
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon="fa-ticket"
            title="No ticket types yet"
            description="Add your first ticket type to start selling."
            action={
              <button
                type="button"
                onClick={() => setPanelProduct('new')}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                Add ticket type
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
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Reservations
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
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
                          {product.name || 'Untitled'}
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
                          {product.status === 'active' ? 'Active' : 'Inactive'}
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
                  {totals.stock} total capacity
                </span>
                <span className="text-slate-600">
                  {totals.reserved} reservations
                </span>
                <span className="text-slate-600">{totals.read} read</span>
              </div>
            )}
          </>
        )}
      </div>

      <SlidePanel
        isOpen={panelOpen}
        onClose={closePanel}
        title={isAdding ? 'Add ticket type' : 'Edit ticket type'}
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
          {isNew ? 'New ticket type' : product?.name || 'Edit ticket'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label="Close"
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
                Details
              </h4>
              <Input
                label="Name"
                name="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Eg: Early Bird VIP"
              />
              <Input
                label="Category"
                name="category"
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                placeholder="Eg: VIP"
              />
              <Input
                label="Promo text"
                name="promo"
                value={form.promo}
                onChange={(e) => update({ promo: e.target.value })}
                placeholder="Optional promo message"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Capacity & pricing
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Stock"
                  name="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => update({ stock: e.target.value })}
                  placeholder="100"
                />
                <Input
                  label="Tickets to deliver"
                  name="productsToDeliver"
                  type="number"
                  value={form.productsToDeliver}
                  onChange={(e) => update({ productsToDeliver: e.target.value })}
                  placeholder="1"
                />
              </div>
              <Input
                label="Price"
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="Eg: 59.90"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status
              </h4>
              <Select
                label="Visibility"
                name="status"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active — visible and sellable' },
                  { value: 'inactive', label: 'Inactive — hidden from buyers' },
                ]}
              />
            </div>

            {product && seatCount > 0 && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <i className="fa-solid fa-armchair" aria-hidden />
                Select Seats ({seatCount} seats)
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
                  Saving…
                </>
              ) : (
                <>{isNew ? 'Create ticket type' : 'Save changes'}</>
              )}
            </button>
            {isNew ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDelete(product.id)}
                disabled={deleting || hasReservations}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={hasReservations ? 'Cannot delete: has reservations' : 'Delete'}
              >
                {deleting ? (
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                ) : (
                  'Delete'
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
