import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { get, put, post } from '../../../../lib/client'
import { Input } from '../../../../components/inputs'
import { PanelHeader } from '../../../../components/shared'
import strings from '../../../../localization'

const MailingPanel = ({ onClose }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [mailing, setMailing] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      sender: '',
      email: '',
      password: '',
      server: '',
      port: '',
    },
  })

  useEffect(() => {
    setError(null)
    get('/mailing')
      .then((res) => {
        const items = res.data ?? []
        const first = items[0]
        if (first) {
          setMailing(first)
          reset({
            sender: first.sender ?? '',
            email: first.email ?? '',
            password: first.password ?? '',
            server: first.server ?? '',
            port: first.port?.toString() ?? '',
          })
        }
      })
      .catch((err) => setError(err?.message ?? strings('error.failedLoadMailing')))
      .finally(() => setLoading(false))
  }, [reset])

  const onSave = async (data) => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        sender: data.sender,
        email: data.email,
        password: data.password || undefined,
        server: data.server,
        port: data.port ? parseInt(data.port, 10) : undefined,
      }
      if (mailing?.id) {
        await put(`/mailing/${mailing.id}`, payload)
        setMailing((prev) => (prev ? { ...prev, ...payload } : null))
      } else {
        const res = await post('/mailing', payload)
        setMailing(res.data ?? { ...payload })
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
        <PanelHeader title={strings('page.settings.mailingSetup')} onClose={onClose} />
        <div className="flex flex-1 items-center justify-center p-6">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-slate-400" aria-hidden />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title={strings('page.settings.mailingSetup')} onClose={onClose} />

      <form onSubmit={handleSubmit(onSave)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <Input
                label={strings('form.mailing.sender')}
                {...register('sender')}
                placeholder={strings('form.mailing.senderPlaceholder')}
                autoComplete="name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={strings('form.mailing.email')}
                type="email"
                {...register('email')}
                placeholder={strings('form.mailing.emailPlaceholder')}
                autoComplete="email"
              />
              <Input
                label={strings('form.mailing.password')}
                type="password"
                {...register('password')}
                placeholder={strings('form.mailing.passwordPlaceholder')}
                autoComplete="password"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={strings('form.mailing.server')}
                {...register('server')}
                placeholder={strings('form.mailing.serverPlaceholder')}
                autoComplete="off"
              />
              <Input
                label={strings('form.mailing.port')}
                type="number"
                {...register('port')}
                placeholder={strings('form.mailing.portPlaceholder')}
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

export default MailingPanel
