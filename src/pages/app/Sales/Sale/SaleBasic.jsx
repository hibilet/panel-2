import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'wouter'

import { post, put } from '../../../../lib/client'
import { useApp, useSale } from '../../../../context'
import { Input, Select, Textarea, Checkbox, FormSection } from '../../../../components/inputs'
import strings from '../../../../localization'

const toDatetimeLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SaleBasic = () => {
  const { id } = useParams()
  const [, setLocation] = useLocation()
  const fileInputRef = useRef(null)
  const { venues, agreements, providers, getVenuePlans } = useApp()
  const { sale, loading: saleLoading, isNew, updateSale } = useSale()

  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    name: '',
    start: '',
    end: '',
    hideStart: false,
    hideEnd: false,
    stopSaleAt: '',
    ticketAdornment: '',
    ticketAdornmentPosition: '',
    ticketAdornmentSize: '',
    venue: '',
    plan: '',
    minAge: 18,
    provider: '',
    currency: 'eur',
    agreement: '',
    category: 'concert',
    rules: '',
  })

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  useEffect(() => {
    if (!isNew && sale) {
      const agreementId = typeof sale.agreement === 'object' ? sale.agreement?.id : sale.agreement
      setForm({
        name: sale.name ?? '',
        start: toDatetimeLocal(sale.start),
        end: toDatetimeLocal(sale.end),
        hideStart: sale.hideStart ?? false,
        hideEnd: sale.hideEnd ?? false,
        stopSaleAt: toDatetimeLocal(sale.stopSaleAt),
        ticketAdornment: sale.ticketAdornment ?? '',
        ticketAdornmentPosition: sale.ticketAdornmentPosition ?? '',
        ticketAdornmentSize: sale.ticketAdornmentSize ?? '',
        venue: sale.venue ?? '',
        plan: sale.plan ?? '',
        minAge: sale.minAge ?? 18,
        provider: sale.provider ?? '',
        currency: sale.currency ?? 'eur',
        agreement: agreementId ?? '',
        category: sale.category ?? 'concert',
        rules: sale.rules ?? '',
      })
    } else if (isNew) {
      setForm({
        name: '',
        start: '',
        end: '',
        hideStart: false,
        hideEnd: false,
        stopSaleAt: '',
        ticketAdornment: '',
        ticketAdornmentPosition: '',
        ticketAdornmentSize: '',
        venue: '',
        plan: '',
        minAge: 18,
        provider: '',
        currency: 'eur',
        agreement: '',
        category: 'concert',
        rules: '',
      })
    }
  }, [sale, isNew])

  useEffect(() => {
    if (!form.venue) {
      setPlans([])
      setForm((prev) => ({ ...prev, plan: '' }))
      return
    }
    setPlansLoading(true)
    getVenuePlans(form.venue)
      .then((r) => setPlans(r ?? []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false))
  }, [form.venue, getVenuePlans])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    window.dispatchEvent(new CustomEvent('sale-basic-saving', { detail: { saving: true } }))
    try {
      const payload = {
        name: form.name,
        start: form.start ? new Date(form.start).toISOString() : undefined,
        end: form.end ? new Date(form.end).toISOString() : undefined,
        hideStart: form.hideStart,
        hideEnd: form.hideEnd,
        stopSaleAt: form.stopSaleAt ? new Date(form.stopSaleAt).toISOString() : undefined,
        ticketAdornment: form.ticketAdornment || undefined,
        ticketAdornmentPosition: form.ticketAdornmentPosition || undefined,
        ticketAdornmentSize: form.ticketAdornmentSize || undefined,
        venue: form.venue || undefined,
        plan: form.plan || undefined,
        minAge: form.minAge,
        provider: form.provider || undefined,
        currency: form.currency,
        agreement: form.agreement || undefined,
        category: form.category,
        rules: form.rules,
      }
      if (isNew) {
        const res = await post('/sales', payload)
        const newId = res.data?.id
        if (newId) setLocation(`/sales/${newId}`)
      } else {
        await put(`/sales/${id}`, payload)
        updateSale(payload)
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(false)
      window.dispatchEvent(new CustomEvent('sale-basic-saving', { detail: { saving: false } }))
    }
  }

  const loading = !isNew && saleLoading

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="h-4 w-48 animate-shimmer rounded" />
        <div className="mt-4 h-10 w-full max-w-md animate-shimmer rounded" />
      </div>
    )
  }

  return (
    <form
      id="sale-basic-form"
      onSubmit={handleSubmit}
      className="overflow-auto"
    >
      <div className="space-y-6">
        <div className="flex flex-1 flex-col md:flex-row md:items-center md:hidden">
          <h2 className="text-lg font-medium text-slate-900" style={{ margin: 0 }}>
            {strings('form.sale.info')}
          </h2>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormSection gridClassName="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-4">
            <Input
              label={strings('form.sale.eventName')}
              name="name"
              type="text"
              placeholder={strings('form.sale.eventNamePlaceholder')}
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div>
            <Input
              label={strings('form.sale.startDateTime')}
              name="start"
              type="datetime-local"
              placeholder="Eg: 15/01/2024 20:00"
              value={form.start}
              onChange={(e) => update({ start: e.target.value })}
            />
            <Checkbox
              label={strings('form.sale.hideStartDate')}
              name="hideStart"
              checked={form.hideStart}
              onChange={(e) => update({ hideStart: e.target.checked })}
              className="mt-2"
            />
          </div>
          <div>
            <Input
              label={strings('form.sale.endDateTime')}
              name="end"
              type="datetime-local"
              placeholder="Eg: 15/01/2024 23:00"
              value={form.end}
              onChange={(e) => update({ end: e.target.value })}
            />
            <Checkbox
              label={strings('form.sale.hideEndDate')}
              name="hideEnd"
              checked={form.hideEnd}
              onChange={(e) => update({ hideEnd: e.target.checked })}
              className="mt-2"
            />
          </div>
          <div>
            <Input
              label={strings('form.sale.stopSaleAt')}
              name="stopSaleAt"
              type="datetime-local"
              placeholder="Eg: 15/01/2024 23:00"
              value={form.stopSaleAt}
              onChange={(e) => update({ stopSaleAt: e.target.value })}
            />
          </div>
        </FormSection>

        <FormSection gridClassName="grid grid-cols-1">
          <label className="block text-sm font-medium text-slate-700">
            {strings('form.sale.comboTicketLogo')}
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="text"
                placeholder={strings('form.sale.uploadImagePlaceholder')}
                value={form.ticketAdornment}
                onChange={(e) => update({ ticketAdornment: e.target.value })}
                className="flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) update({ ticketAdornment: f.name })
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {strings('form.sale.uploadImage')}
              </button>
            </div>
          </label>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
            <Select
              label={strings('form.sale.logoPosition')}
              name="ticketAdornmentPosition"
              value={form.ticketAdornmentPosition}
              onChange={(e) => update({ ticketAdornmentPosition: e.target.value })}
              placeholder={strings('form.sale.selectPosition')}
              options={[
                { value: 'top', label: strings('form.sale.position.top') },
                { value: 'bottom', label: strings('form.sale.position.bottom') },
                { value: 'left', label: strings('form.sale.position.left') },
                { value: 'right', label: strings('form.sale.position.right') },
              ]}
            />
            <Select
              label={strings('form.sale.logoSize')}
              name="ticketAdornmentSize"
              value={form.ticketAdornmentSize}
              onChange={(e) => update({ ticketAdornmentSize: e.target.value })}
              placeholder={strings('form.sale.selectSize')}
              options={[
                { value: 'small', label: strings('form.sale.size.small') },
                { value: 'medium', label: strings('form.sale.size.medium') },
                { value: 'large', label: strings('form.sale.size.large') },
              ]}
            />
          </section>
        </FormSection>

        <FormSection title={strings('form.sale.venueSeating')} gridClassName="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label={strings('form.sale.venue')}
            name="venue"
            value={form.venue}
            onChange={(e) => update({ venue: e.target.value, plan: '' })}
            options={[
              { value: '', label: strings('form.sale.noVenue') },
              ...venues.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
          <Select
            label={strings('form.sale.seatingPlan')}
            name="plan"
            value={form.plan}
            onChange={(e) => update({ plan: e.target.value })}
            disabled={!form.venue || plansLoading}
            options={[
              { value: '', label: strings('form.sale.noSeating') },
              ...plans.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Input
            label={strings('form.sale.minimumAge')}
            name="minAge"
            type="number"
            placeholder={strings('form.sale.minAgePlaceholder')}
            value={form.minAge}
            onChange={(e) => update({ minAge: Number(e.target.value) || 18 })}
          />
        </FormSection>

        <FormSection title={strings('form.sale.paymentLegal')} gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select
            label={strings('form.sale.transactionProvider')}
            name="provider"
            value={form.provider}
            onChange={(e) => update({ provider: e.target.value })}
            placeholder={strings('form.sale.selectProvider')}
            options={providers.map((p) => ({ value: p.id, label: p.name ?? p.id }))}
          />
          <Select
            label={strings('form.sale.currency')}
            name="currency"
            value={form.currency}
            onChange={(e) => update({ currency: e.target.value })}
            options={[
              { value: 'eur', label: strings('form.sale.currency.eur') },
              { value: 'chf', label: strings('form.sale.currency.chf') },
              { value: 'usd', label: strings('form.sale.currency.usd') },
            ]}
          />
          <Select
            label={strings('form.sale.salesAgreement')}
            name="agreement"
            value={form.agreement}
            onChange={(e) => update({ agreement: e.target.value })}
            placeholder={strings('form.sale.selectAgreement')}
            options={agreements.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Select
            label={strings('form.sale.eventCategory')}
            name="category"
            value={form.category}
            onChange={(e) => update({ category: e.target.value })}
            options={[
              { value: 'concert', label: strings('form.sale.category.concert') },
              { value: 'festival', label: strings('form.sale.category.festival') },
              { value: 'tour', label: strings('form.sale.category.tour') },
              { value: 'experience', label: strings('form.sale.category.experience') },
            ]}
          />
        </FormSection>

        <FormSection gridClassName="grid grid-cols-1">
          <Textarea
            label={strings('form.sale.rules')}
            name="rules"
            placeholder={strings('form.sale.rulesPlaceholder')}
            value={form.rules}
            onChange={(e) => update({ rules: e.target.value })}
            className="min-h-[200px]"
          />
        </FormSection>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              {strings('common.saving')}
            </>
          ) : (
            <>{strings('form.sale.save')}</>
          )}
        </button>
      </div>
    </form>
  )
}

export default SaleBasic
