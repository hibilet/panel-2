import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { get } from '../lib/client'

const AppContext = createContext(null)

const mapSalesRows = (rows) =>
  (rows ?? []).map((row) => ({
    ...row,
    startDate: row.start ?? row.startDate,
  }))

export const AppProvider = ({ children }) => {
  const [account, setAccount] = useState(null)
  const [sales, setSales] = useState([])
  const [providers, setProviders] = useState([])
  const [agreements, setAgreements] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const venuePlansRef = useRef({})

  const fetchInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountRes, salesRes, providersRes, agreementsRes, venuesRes] = await Promise.all([
        get('/accounts/me').then((r) => r).catch(() => ({ data: null })),
        get('/sales'),
        get('/providers'),
        get('/agreements'),
        get('/venues'),
      ])
      setAccount(accountRes?.data ?? null)
      setSales(mapSalesRows(salesRes.data ?? []))
      setProviders(providersRes.data ?? [])
      setAgreements(agreementsRes.data ?? [])
      setVenues(venuesRes.data ?? [])
    } catch (err) {
      setError(err?.message ?? 'Failed to load app data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const getVenuePlans = useCallback(async (venueId) => {
    if (!venueId) return []
    if (venuePlansRef.current[venueId]) return venuePlansRef.current[venueId]
    try {
      const r = await get(`/venues/plans/search?venue=${venueId}`)
      const plans = r.data ?? []
      venuePlansRef.current[venueId] = plans
      return plans
    } catch {
      return []
    }
  }, [])

  const refreshSales = useCallback(async (opts = {}) => {
    const qs = opts.revenue ? '?revenue=true' : ''
    try {
      const r = await get(`/sales${qs}`)
      setSales(mapSalesRows(r.data ?? []))
      return r.data ?? []
    } catch (err) {
      setError(err?.message ?? 'Failed to refresh sales')
      return []
    }
  }, [])

  const value = {
    account,
    sales,
    providers,
    agreements,
    venues,
    getVenuePlans,
    loading,
    error,
    refreshSales,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default AppContext
