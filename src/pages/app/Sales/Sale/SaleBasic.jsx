import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'wouter'

import { post, put } from '../../../../lib/client'
import { useApp, useSale } from '../../../../context'
import { Input, Select, Textarea, Checkbox, FormSection } from '../../../../components/inputs'

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
      setError(err?.message ?? 'Failed to save')
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
            ℹ️ Info
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
              label="Event Name"
              name="name"
              type="text"
              placeholder="Eg: Chillout Festival 2024"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div>
            <Input
              label="Start Date & Time"
              name="start"
              type="datetime-local"
              placeholder="Eg: 15/01/2024 20:00"
              value={form.start}
              onChange={(e) => update({ start: e.target.value })}
            />
            <Checkbox
              label="Hide Start Date"
              name="hideStart"
              checked={form.hideStart}
              onChange={(e) => update({ hideStart: e.target.checked })}
              className="mt-2"
            />
          </div>
          <div>
            <Input
              label="End Date & Time"
              name="end"
              type="datetime-local"
              placeholder="Eg: 15/01/2024 23:00"
              value={form.end}
              onChange={(e) => update({ end: e.target.value })}
            />
            <Checkbox
              label="Hide End Date"
              name="hideEnd"
              checked={form.hideEnd}
              onChange={(e) => update({ hideEnd: e.target.checked })}
              className="mt-2"
            />
          </div>
          <div>
            <Input
              label="Stop Sale At"
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
            Combo Ticket / Logo
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="text"
                placeholder="Please upload an image"
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
                Upload Image
              </button>
            </div>
          </label>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
            <Select
              label="Combo Ticket / Logo Position"
              name="ticketAdornmentPosition"
              value={form.ticketAdornmentPosition}
              onChange={(e) => update({ ticketAdornmentPosition: e.target.value })}
              placeholder="Select position"
              options={[
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
            />
            <Select
              label="Combo Ticket / Logo Size"
              name="ticketAdornmentSize"
              value={form.ticketAdornmentSize}
              onChange={(e) => update({ ticketAdornmentSize: e.target.value })}
              placeholder="Select size"
              options={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
            />
          </section>
        </FormSection>

        <FormSection title="Venue & Seating" gridClassName="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Venue"
            name="venue"
            value={form.venue}
            onChange={(e) => update({ venue: e.target.value, plan: '' })}
            options={[
              { value: '', label: 'No Venue' },
              ...venues.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
          <Select
            label="Seating Plan"
            name="plan"
            value={form.plan}
            onChange={(e) => update({ plan: e.target.value })}
            disabled={!form.venue || plansLoading}
            options={[
              { value: '', label: 'No Seating' },
              ...plans.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <Input
            label="Minimum Age"
            name="minAge"
            type="number"
            placeholder="Eg: 18"
            value={form.minAge}
            onChange={(e) => update({ minAge: Number(e.target.value) || 18 })}
          />
        </FormSection>

        <FormSection title="Payment & Legal" gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Transaction Provider"
            name="provider"
            value={form.provider}
            onChange={(e) => update({ provider: e.target.value })}
            placeholder="Please select a provider"
            options={providers.map((p) => ({ value: p.id, label: p.name ?? p.id }))}
          />
          <Select
            label="Currency"
            name="currency"
            value={form.currency}
            onChange={(e) => update({ currency: e.target.value })}
            options={[
              { value: 'eur', label: 'Euro' },
              { value: 'chf', label: 'Swiss Franc' },
              { value: 'usd', label: 'US Dollar' },
            ]}
          />
          <Select
            label="Sales Agreement"
            name="agreement"
            value={form.agreement}
            onChange={(e) => update({ agreement: e.target.value })}
            placeholder="Please select an agreement"
            options={agreements.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Select
            label="Event Category"
            name="category"
            value={form.category}
            onChange={(e) => update({ category: e.target.value })}
            options={[
              { value: 'concert', label: 'Concert' },
              { value: 'festival', label: 'Festival' },
              { value: 'tour', label: 'Tour' },
              { value: 'experience', label: 'Experience' },
            ]}
          />
        </FormSection>

        <FormSection gridClassName="grid grid-cols-1">
          <Textarea
            label="Rules"
            name="rules"
            placeholder="Please provide rules..."
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
              Saving…
            </>
          ) : (
            <>💾 Save</>
          )}
        </button>
      </div>
    </form>
  )
}

export default SaleBasic
