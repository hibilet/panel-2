import { useEffect, useState } from 'react'

import { get } from '../../../lib/client'
import SalesTable from '../../../components/tables/SalesTable'

const Sales = () => {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    get('/sales')
      .then((res) => {
        const rows = (res.data ?? []).map((row) => ({
          ...row,
          startDate: row.start,
        }))
        setSales(rows)
      })
      .catch((err) => setError(err?.message ?? 'Failed to load sales'))
      .finally(() => setLoading(false))
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
      <SalesTable data={sales} />
    </div>
  )
}

export default Sales
