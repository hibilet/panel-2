import { useEffect, useState } from 'react'

import { get } from '../../../lib/client'
import LinksTable from '../../../components/tables/LinksTable'

const Links = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    get('/links')
      .then((res) => {
        const items = res.data ?? []
        setData(items.map((row) => ({
          ...row,
          reservations: row.sales?.length ?? 0,
        })))
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load links')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <LinksTable data={data} />
    </div>
  )
}

export default Links
