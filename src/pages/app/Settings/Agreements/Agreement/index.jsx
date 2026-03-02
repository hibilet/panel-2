import { useState, useEffect } from 'react'

import { get, post, put } from '../../../../../lib/client'
import { Input, Textarea } from '../../../../../components/inputs'
import strings from '../../../../../localization'

const AgreementPanel = ({ id, onClose, onSaved }) => {
  const isNew = id === 'new'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    name: '',
    content: '',
  })

  const update = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      setData(null)
      setForm({ name: '', content: '' })
      return
    }
    setLoading(true)
    setError(null)
    get(`/agreements/${id}`)
      .then((res) => {
        const d = res.data ?? null
        setData(d)
        if (d) {
          setForm({
            name: d.name ?? '',
            content: d.content ?? '',
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
        content: form.content?.trim() || undefined,
      }
      if (isNew) {
        const res = await post('/agreements', payload)
        const created = res.data ?? null
        setData(created)
        if (created?.id) onSaved?.(created.id)
      } else {
        await put(`/agreements/${id}`, payload)
        setData((prev) => (prev ? { ...prev, ...payload } : null))
        onSaved?.()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isNew ? strings('form.agreement.newTitle') : strings('form.agreement.editTitle')}
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
          {isNew ? strings('form.agreement.newTitle') : (data?.name ?? strings('form.agreement.editTitle'))}
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
                label={strings('form.agreement.name')}
                name="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={strings('form.agreement.namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Textarea
                label={strings('form.agreement.content')}
                name="content"
                value={form.content}
                onChange={(e) => update({ content: e.target.value })}
                placeholder={strings('form.agreement.contentPlaceholder')}
                rows={16}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
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

export default AgreementPanel
