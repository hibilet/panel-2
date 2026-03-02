import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'wouter'
import { useForm } from 'react-hook-form'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { get, post, put, del } from '../../../../lib/client'
import { useSale } from '../../../../context'
import { Input } from '../../../../components/inputs'
import { EmptyState, Modal, SlidePanel } from '../../../../components/shared'
import DataTable from '../../../../components/tables/DataTable'
import { channelColumns } from '../../../../components/tables/columns'
import strings from '../../../../localization'

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']
const RESERVATION_LABELS = {
  created: `➕ ${strings('status.created')}`,
  success: `✅ ${strings('status.success')}`,
  pending: `⏳ ${strings('status.pending')}`,
  cancelled: `⛔ ${strings('status.cancelled')}`,
}

const API_BASE = import.meta.env.VITE_API_URL || ''
const APP_BASE = import.meta.env.VITE_APP_URL || API_BASE.replace(/api[^.]*/, 'app')

const getChannelLink = (channelId) => {
  if (!channelId || !APP_BASE) return null
  const base = APP_BASE.replace(/\/$/, '')
  return `${base}/${channelId}`
}

const getInitialForm = (channel) => {
  if (channel) {
    return {
      name: channel.name ?? '',
    }
  }
  return { name: '' }
}

const SaleChannels = () => {
  const { id } = useParams()
  const { channels, setChannels, loading, isNew } = useSale()

  const [error, setError] = useState(null)
  const [panelChannel, setPanelChannel] = useState(null)
  const [saving, setSaving] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [reportChannel, setReportChannel] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  const panelOpen = panelChannel !== null
  const isAdding = panelChannel === 'new'

  const closePanel = useCallback(() => setPanelChannel(null), [])
  const closeReport = useCallback(() => {
    setReportChannel(null)
    setReportData(null)
  }, [])

  const handleSave = async (channel, payload) => {
    setSaving(channel?.id ?? 'new')
    setError(null)
    try {
      if (channel?.id) {
        await put(`/channels/${channel.id}`, payload)
        setChannels((prev) =>
          prev.map((c) => (c.id === channel.id ? { ...c, ...payload } : c))
        )
        closePanel()
      } else {
        const res = await post(`/sales/${id}/channels`, payload)
        setChannels((prev) => [...prev, res.data])
        closePanel()
      }
    } catch (err) {
      setError(err?.message ?? strings('error.failedSave'))
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (channelId) => {
    if (!confirm(strings('form.channel.confirmDelete'))) return
    setDeleting(channelId)
    setError(null)
    try {
      await del(`/channels/${channelId}`)
      setChannels((prev) => prev.filter((c) => c.id !== channelId))
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

  const isBaseChannel = (channel) => {
    const name = (channel?.name ?? '').toLowerCase()
    return name === 'base-sale' || name === 'base sale'
  }

  const handleReportsClick = async (channel) => {
    setReportChannel(channel)
    setReportData(null)
    setReportLoading(true)
    try {
      const r = await get(`/channels/${channel.id}/report`)
      setReportData(r.data ?? null)
    } catch (err) {
      setError(err?.message ?? strings('error.failedLoad'))
      setReportChannel(null)
    } finally {
      setReportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
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
            <h2 className="text-lg font-medium text-slate-900">{strings('form.channel.title')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {channels.length === 1 ? strings('form.channel.count', [channels.length]) : strings('form.channel.countPlural', [channels.length])}
            </p>
          </div>
          {!isNew && (
            <button
              type="button"
              onClick={() => setPanelChannel('new')}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              {strings('form.channel.addChannel')}
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
            icon="fa-bullhorn"
            variant="amber"
            title={strings('form.channel.saveFirst')}
            description={strings('form.channel.saveFirstDesc')}
          />
        ) : channels.length === 0 ? (
          <EmptyState
            icon="fa-bullhorn"
            title={strings('form.channel.noChannels')}
            description={strings('form.channel.noChannelsDesc')}
            action={
              <button
                type="button"
                onClick={() => setPanelChannel('new')}
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                {strings('form.channel.addChannel')}
              </button>
            }
          />
        ) : (
          <DataTable
            data={channels}
            columns={channelColumns(getChannelLink, isBaseChannel, CopyButton)}
            getRowKey={(r) => r.id}
            onRowClick={setPanelChannel}
          />
        )}
      </div>

      {reportChannel && (
        <ChannelReportDialog
          channel={reportChannel}
          data={reportData}
          loading={reportLoading}
          onClose={closeReport}
        />
      )}

      <SlidePanel
        isOpen={panelOpen}
        onClose={closePanel}
        aria-label={isAdding ? strings('form.channel.addChannelPanel') : strings('form.channel.editChannelPanel')}
      >
        <ChannelPanel
              key={isAdding ? 'new' : panelChannel?.id ?? 'edit'}
              channel={isAdding ? null : panelChannel}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={closePanel}
              onReportsClick={handleReportsClick}
              saving={saving}
              deleting={deleting}
            />
      </SlidePanel>
    </div>
  )
}

const ChannelReportDialog = ({ channel, data, loading, onClose }) => {
  const printRef = useRef(null)

  const handlePrint = () => {
    if (!printRef.current) return
    const printContent = printRef.current.innerHTML
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${strings('form.channel.report', [channel?.name ?? strings('form.channel.channel')])}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="p-8">
          <h1 class="text-2xl font-bold mb-6">${strings('form.channel.report', [channel?.name ?? strings('form.channel.channel')])}</h1>
          <div class="channel-report-print">${printContent}</div>
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

  const devicesData = (data?.devices ?? []).map((d) => ({
    name: d.id,
    value: d.count,
  }))
  const totalDevices = devicesData.reduce((s, d) => s + d.value, 0)

  const reservationsData = (data?.reservations ?? []).map((r) => ({
    name: RESERVATION_LABELS[r.id] ?? r.id,
    value: r.count,
  }))
  const totalReservations = reservationsData.reduce((s, r) => s + r.value, 0)

  const agesData = data?.attendeeAges
    ? Object.entries(data.attendeeAges)
        .map(([age, count]) => ({ age: Number(age), count }))
        .sort((a, b) => a.age - b.age)
    : []

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={strings('form.channel.report', [channel?.name ?? strings('form.channel.channel')])}
      maxWidth="4xl"
      bodyRef={printRef}
      headerActions={
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading || !data}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          aria-label={strings('form.channel.ariaPrintReport')}
        >
          <i className="fa-solid fa-print" aria-hidden />
          {strings('form.channel.print')}
        </button>
      }
    >
          {loading ? (
            <div className="flex flex-col gap-6 py-12">
              <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-500">
              {strings('form.channel.noReportData')}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {strings('form.channel.devicesByView')}
                  </h3>
                  <div className="h-72">
                    {devicesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={devicesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) =>
                              `${name} (${totalDevices > 0 ? ((value / totalDevices) * 100).toFixed(1) : 0}%)`
                            }
                          >
                            {devicesData.map((entry, idx) => (
                              <Cell
                                key={`${entry.name}-${entry.value}`}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              value,
                              totalDevices > 0
                                ? `${((value / totalDevices) * 100).toFixed(1)}%`
                                : '',
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        {strings('form.channel.noDeviceData')}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {strings('form.channel.userInteraction')}
                  </h3>
                  <div className="h-72">
                    {reservationsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reservationsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) =>
                              `${name} (${totalReservations > 0 ? ((value / totalReservations) * 100).toFixed(1) : 0}%)`
                            }
                          >
                            {reservationsData.map((entry, idx) => (
                              <Cell
                                key={`${entry.name}-${entry.value}`}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              value,
                              totalReservations > 0
                                ? `${((value / totalReservations) * 100).toFixed(1)}%`
                                : '',
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        {strings('form.channel.noReservationData')}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  {strings('form.channel.attendeeAges')}
                </h3>
                <div className="h-64">
                  {agesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={agesData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="age"
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickLine={{ stroke: '#e2e8f0' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          dataKey="count"
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickLine={{ stroke: '#e2e8f0' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <Tooltip
                          formatter={(value) => [value, strings('form.channel.count')]}
                          labelFormatter={(label) => `${strings('form.channel.age')} ${label}`}
                        />
                        <Bar
                          dataKey="count"
                          fill="#0088FE"
                          radius={[4, 4, 0, 0]}
                          name={strings('form.channel.attendees')}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      {strings('form.channel.noAgeData')}
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm">
                <span className="font-medium text-slate-700">
                  {strings('form.channel.views')}: {(data?.views ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
    </Modal>
  )
}

const CopyButton = ({ text, stopPropagation }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    if (stopPropagation) e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      aria-label={copied ? strings('form.channel.copied') : strings('form.channel.copyLink')}
      title={strings('form.channel.copyLink')}
    >
      {copied ? (
        <i className="fa-solid fa-check text-emerald-600" aria-hidden />
      ) : (
        <i className="fa-solid fa-copy" aria-hidden />
      )}
    </button>
  )
}

const ChannelPanel = ({
  channel,
  onSave,
  onDelete,
  onClose,
  onReportsClick,
  saving,
  deleting,
}) => {
  const isNew = channel === null
  const isBase = channel && ['base-sale', 'base sale'].includes((channel?.name ?? '').toLowerCase())
  const defaultValues = getInitialForm(channel)
  const { register, handleSubmit, reset } = useForm({ defaultValues })

  useEffect(() => {
    reset(getInitialForm(channel))
  }, [channel, reset])

  const onFormSubmit = (formData) => {
    const payload = {
      name: formData.name || undefined,
    }
    onSave(channel, payload)
  }

  const link = !isNew && channel ? getChannelLink(channel.id) : null

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isNew ? strings('form.channel.newChannel') : channel?.name || strings('form.channel.editChannel')}
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
        onSubmit={handleSubmit(onFormSubmit)}
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
                {...register('name')}
                placeholder={strings('form.channel.namePlaceholder')}
                disabled={isBase}
              />
            </div>

            {link && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {strings('form.channel.channelLink')}
                </h4>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-slate-600 underline hover:text-slate-900"
                  >
                    {link}
                  </a>
                  <CopyButton text={link} />
                </div>
              </div>
            )}

            {!isNew && channel && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {strings('form.channel.stats')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-slate-700">
                      {strings('form.channel.views')}
                    </span>
                    <p className="mt-1 text-slate-600">
                      {(channel.views ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-slate-700">
                      {strings('form.channel.sales')}
                    </span>
                    <p className="mt-1 text-slate-600">
                      {(channel.sales ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                {onReportsClick && (
                  <button
                    type="button"
                    onClick={() => onReportsClick(channel)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <i className="fa-solid fa-chart-pie" aria-hidden />
                    {strings('form.channel.reports')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            {isBase ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {strings('common.close')}
              </button>
            ) : (
              <>
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
                <>{isNew ? strings('form.channel.createChannel') : strings('form.ticket.saveChanges')}</>
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
                onClick={() => onDelete(channel.id)}
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
              </>
            )}
          </div>
        </footer>
      </form>
    </div>
  )
}

export default SaleChannels
