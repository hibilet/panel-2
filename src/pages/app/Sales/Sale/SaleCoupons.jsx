import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'wouter'

import { get, post, put, del } from '../../../../lib/client'
import { useSale } from '../../../../context'
import { Input, Select } from '../../../../components/inputs'
import { EmptyState, SlidePanel } from '../../../../components/shared'
import strings from '../../../../localization'

const formatDiscount = (value) => {
  if (value == null) return '—'
  if (value < 1) return `${(value * 100).toFixed(0)}%`
  return value.toLocaleString()
}

const getInitialForm = (coupon) => {
  if (coupon) {
    return {
      code: coupon.code ?? '',
      channel: coupon.channel ?? '',
      stock: String(coupon.stock ?? ''),
      discount: String(coupon.discount ?? ''),
      status: coupon.status ?? 'active',
    }
  }
  return {
    code: '',
    channel: '',
    stock: '',
    discount: '',
    status: 'active',
  }
}

const SaleCoupons = () => {
  const { id } = useParams()
  const { channels, loading, isNew } = useSale()

  const [coupons, setCoupons] = useState([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [panelCoupon, setPanelCoupon] = useState(null)
  const [saving, setSaving] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const panelOpen = panelCoupon !== null
  const isAdding = panelCoupon === 'new'

  useEffect(() => {
    if (isNew) {
      setCouponsLoading(false)
      setCoupons([])
      return
    }
    setCouponsLoading(true)
    get(`/sales/${id}/coupons`)
      .then((r) => setCoupons(r.data ?? []))
      .catch((err) => setError(err?.message ?? strings('error.failedLoadCoupons')))
      .finally(() => setCouponsLoading(false))
  }, [id, isNew])

  const closePanel = useCallback(() => setPanelCoupon(null), [])

  const handleSave = async (coupon, payload) => {
    setSaving(coupon?.id ?? 'new')
    setError(null)
    try {
      if (coupon?.id) {
        await put(`/coupons/${coupon.id}`, payload)
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, ...payload } : c))
        )
        closePanel()
      } else {
        const res = await post(`/sales/${id}/coupons`, payload)
        setCoupons((prev) => [...prev, res.data])
        closePanel()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (couponId) => {
    if (!confirm(strings('form.coupon.confirmDelete'))) return
    setDeleting(couponId)
    setError(null)
    try {
      await del(`/coupons/${couponId}`)
      setCoupons((prev) => prev.filter((c) => c.id !== couponId))
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

  const getChannelName = (channelId) => {
    if (!channelId) return '—'
    const ch = channels.find((c) => c.id === channelId)
    return ch?.name ?? channelId
  }

  if (loading || couponsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
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
            <h2 className="text-lg font-medium text-slate-900">{strings('form.coupon.title')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {coupons.length === 1 ? strings('form.coupon.count', [coupons.length]) : strings('form.coupon.countPlural', [coupons.length])}
            </p>
          </div>
          {!isNew && (
            <button
              type="button"
              onClick={() => setPanelCoupon('new')}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              {strings('form.coupon.addCoupon')}
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
            icon="fa-tag"
            variant="amber"
            title={strings('form.coupon.saveFirst')}
            description={strings('form.coupon.saveFirstDesc')}
          />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon="fa-tag"
            title={strings('form.coupon.noCoupons')}
            description={strings('form.coupon.noCouponsDesc')}
            action={
              <button
                type="button"
                onClick={() => setPanelCoupon('new')}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                {strings('form.coupon.addCoupon')}
              </button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <li key={coupon.id}>
                  <button
                    type="button"
                    onClick={() => setPanelCoupon(coupon)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-900">
                          {coupon.code || strings('common.untitled')}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            coupon.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {coupon.status === 'active' ? strings('common.active') : strings('common.inactive')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {getChannelName(coupon.channel)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-6 text-sm">
                      <span className="font-medium text-slate-700">
                        {formatDiscount(coupon.discount)}
                      </span>
                      <span className="text-slate-500">
                        {strings('form.coupon.stockLabel')} {coupon.stock ?? 0}
                      </span>
                      <span className="text-slate-500">
                        {strings('form.coupon.usedLabel')} {coupon.used ?? 0}
                      </span>
                      <i
                        className="fa-solid fa-chevron-right text-slate-300"
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <SlidePanel
        isOpen={panelOpen}
        onClose={closePanel}
        aria-label={isAdding ? strings('form.coupon.addCoupon') : strings('form.coupon.editCoupon')}
      >
        <CouponPanel
              key={isAdding ? 'new' : panelCoupon?.id ?? 'edit'}
              coupon={isAdding ? null : panelCoupon}
              channels={channels}
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

const CouponPanel = ({
  coupon,
  channels,
  onSave,
  onDelete,
  onClose,
  saving,
  deleting,
}) => {
  const isNew = coupon === null
  const [form, setForm] = useState(() => getInitialForm(coupon))

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const discountValue = form.discount ? parseFloat(form.discount) : undefined
    const payload = {
      code: form.code || undefined,
      channel: form.channel || undefined,
      stock: form.stock ? Number(form.stock) : undefined,
      discount: discountValue,
      status: form.status || 'active',
    }
    onSave(coupon, payload)
  }

  const hasUsed = (coupon?.used ?? 0) > 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isNew ? strings('form.coupon.newCoupon') : coupon?.code || strings('form.coupon.editCoupon')}
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
                {strings('form.coupon.code')}
              </h4>
              <Input
                label={strings('form.coupon.couponCode')}
                name="code"
                value={form.code}
                onChange={(e) => update({ code: e.target.value.toUpperCase() })}
                placeholder={strings('form.coupon.codePlaceholder')}
                className="font-mono"
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {strings('form.coupon.discountLimits')}
              </h4>
              <Input
                label={strings('form.coupon.discount')}
                name="discount"
                placeholder={strings('form.coupon.discountPlaceholder')}
                value={form.discount}
                onChange={(e) => update({ discount: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={strings('form.coupon.stock')}
                  name="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => update({ stock: e.target.value })}
                  placeholder={strings('form.ticket.stockPlaceholder')}
                />
                {!isNew && coupon && (
                  <div>
                    <span className="block text-sm font-medium text-slate-700">
                      {strings('form.coupon.used')}
                    </span>
                    <p className="mt-1 text-slate-600">{coupon.used ?? 0}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {strings('form.coupon.channelStatus')}
              </h4>
              <Select
                label={strings('form.channel.channel')}
                name="channel"
                value={form.channel}
                onChange={(e) => update({ channel: e.target.value })}
                placeholder={strings('form.coupon.selectChannel')}
                options={[
                  { value: '', label: strings('form.coupon.selectChannel') },
                  ...channels.map((c) => ({ value: c.id, label: c.name ?? c.id })),
                ]}
              />
              <Select
                label={strings('common.status')}
                name="status"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
                options={[
                  { value: 'active', label: strings('form.coupon.statusActive') },
                  { value: 'inactive', label: strings('form.coupon.statusInactive') },
                ]}
              />
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  {strings('common.saving')}
                </>
              ) : (
                <>{isNew ? strings('form.coupon.createCoupon') : strings('form.ticket.saveChanges')}</>
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
                onClick={() => onDelete(coupon.id)}
                disabled={deleting || hasUsed}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={hasUsed ? strings('form.coupon.cannotDeleteUsed') : strings('common.delete')}
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

export default SaleCoupons
