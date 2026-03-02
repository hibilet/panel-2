import { useState, useEffect } from 'react'

import { get, post, put } from '../../../../../lib/client'
import { Input, Select } from '../../../../../components/inputs'
import strings from '../../../../../localization'

const COUNTRY_OPTIONS = [
  { value: 'TR', labelKey: 'form.provider.countryTR' },
  { value: 'DE', labelKey: 'form.provider.countryDE' },
  { value: 'NL', labelKey: 'form.provider.countryNL' },
]

const CURRENCY_OPTIONS = [
  { value: 'EUR', labelKey: 'form.provider.currencyEUR' },
  { value: 'TRY', labelKey: 'form.provider.currencyTRY' },
  { value: 'USD', labelKey: 'form.provider.currencyUSD' },
]

const TYPE_OPTIONS = [
  { value: 'provider.paywall', labelKey: 'form.provider.typePaywall' },
  { value: 'provider.stripe', labelKey: 'form.provider.typeStripe' },
]

const ProviderPanel = ({ id, onClose, onSaved }) => {
  const isNew = id === 'new'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    name: '',
    bank: '',
    country: '',
    currency: 'EUR',
    type: '',
    apiKey: '',
    apiSecret: '',
    webhookSecret: '',
  })

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setData(null)
      setForm({
        name: '',
        bank: '',
        country: '',
        currency: 'EUR',
        type: '',
        apiKey: '',
        apiSecret: '',
        webhookSecret: '',
      })
      return
    }
    setLoading(true)
    setError(null)
    get(`/providers/${id}`)
      .then((res) => {
        const d = res.data ?? null
        setData(d)
        if (d) {
          setForm({
            name: d.name ?? '',
            bank: d.bank ?? '',
            country: d.country ?? '',
            currency: d.currency ?? 'EUR',
            type: d.type ?? '',
            apiKey: d.apiKey ?? '',
            apiSecret: d.apiSecret ?? '',
            webhookSecret: d.webhookSecret ?? '',
          })
        }
      })
      .catch((err) => setError(err?.message ?? strings('error.failedLoad')))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const handleSave = async (e) => {
    e?.preventDefault?.()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name?.trim() || undefined,
        bank: form.bank?.trim() || undefined,
        country: form.country || undefined,
        currency: form.currency || undefined,
        type: form.type || undefined,
        apiKey: form.apiKey?.trim() || undefined,
        apiSecret: form.apiSecret?.trim() || undefined,
        webhookSecret: form.webhookSecret?.trim() || undefined,
      }
      if (isNew) {
        const res = await post('/providers', payload)
        const created = res.data ?? null
        setData(created)
        if (created?.id) onSaved?.(created.id)
      } else {
        await put(`/providers/${id}`, payload)
        setData((prev) => (prev ? { ...prev, ...payload } : null))
        onSaved?.()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(false)
    }
  }

  const showStripeFields = form.type === 'provider.stripe'

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isNew ? strings('form.provider.newTitle') : strings('form.provider.editTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={strings('common.ariaClose')}
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden />
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isNew ? strings('form.provider.newTitle') : (data?.name ?? strings('form.provider.editTitle'))}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          aria-label={strings('common.ariaClose')}
        >
          <i className="fa-solid fa-xmark text-lg" aria-hidden />
        </button>
      </header>

      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <Input
                label={strings('form.provider.name')}
                name="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={strings('form.provider.namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label={strings('form.provider.bank')}
                name="bank"
                value={form.bank}
                onChange={(e) => update({ bank: e.target.value })}
                placeholder={strings('form.provider.bankPlaceholder')}
              />
              <Select
                label={strings('form.provider.country')}
                name="country"
                value={form.country}
                onChange={(e) => update({ country: e.target.value })}
                placeholder={strings('form.provider.selectCountry')}
                options={COUNTRY_OPTIONS.map((o) => ({ value: o.value, label: strings(o.labelKey) }))}
              />
              <Select
                label={strings('form.provider.currency')}
                name="currency"
                value={form.currency}
                onChange={(e) => update({ currency: e.target.value })}
                placeholder={strings('form.provider.selectCurrency')}
                options={CURRENCY_OPTIONS.map((o) => ({ value: o.value, label: strings(o.labelKey) }))}
              />
              <Select
                label={strings('form.provider.type')}
                name="type"
                value={form.type}
                onChange={(e) => update({ type: e.target.value })}
                placeholder={strings('form.provider.selectType')}
                options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: strings(o.labelKey) }))}
              />
            </div>

            {showStripeFields && (
              <>
                <hr className="border-slate-200 dark:border-slate-700" />
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label={strings('form.provider.apiKey')}
                    name="apiKey"
                    type="text"
                    value={form.apiKey}
                    onChange={(e) => update({ apiKey: e.target.value })}
                    placeholder={strings('form.provider.apiKeyPlaceholder')}
                    autoComplete="off"
                  />
                  <Input
                    label={strings('form.provider.apiSecret')}
                    name="apiSecret"
                    type="password"
                    value={form.apiSecret}
                    onChange={(e) => update({ apiSecret: e.target.value })}
                    placeholder={strings('form.provider.apiSecretPlaceholder')}
                    autoComplete="off"
                  />
                  <Input
                    label={strings('form.provider.webhookSecret')}
                    name="webhookSecret"
                    type="password"
                    value={form.webhookSecret}
                    onChange={(e) => update({ webhookSecret: e.target.value })}
                    placeholder={strings('form.provider.webhookSecretPlaceholder')}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                {strings('common.saving')}
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" aria-hidden />
                {strings('common.save')}
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  )
}

export default ProviderPanel
