import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { get } from '../lib/client'

const SaleContext = createContext(null)

export const SaleProvider = ({ children, saleId }) => {
  const [sale, setSale] = useState(null)
  const [products, setProducts] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isNew = saleId === 'new'

  const fetchSaleData = useCallback(async () => {
    if (isNew) {
      setSale(null)
      setProducts([])
      setChannels([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [saleRes, productsRes, channelsRes] = await Promise.all([
        get(`/sales/${saleId}`),
        get(`/sales/${saleId}/products`),
        get(`/sales/${saleId}/channels`),
      ])
      setSale(saleRes.data ?? null)
      setProducts(productsRes.data ?? [])
      setChannels(channelsRes.data ?? [])
    } catch (err) {
      setError(err?.message ?? 'Failed to load sale')
    } finally {
      setLoading(false)
    }
  }, [saleId, isNew])

  useEffect(() => {
    fetchSaleData()
  }, [fetchSaleData])

  const updateSale = useCallback((updates) => {
    setSale((prev) => (prev ? { ...prev, ...updates } : updates))
  }, [])

  const setProductsState = useCallback((updater) => {
    setProducts(updater)
  }, [])

  const setChannelsState = useCallback((updater) => {
    setChannels(updater)
  }, [])

  const value = {
    sale,
    products,
    channels,
    loading,
    error,
    isNew,
    updateSale,
    setProducts: setProductsState,
    setChannels: setChannelsState,
    refresh: fetchSaleData,
  }

  return <SaleContext.Provider value={value}>{children}</SaleContext.Provider>
}

export const useSale = () => {
  const ctx = useContext(SaleContext)
  if (!ctx) throw new Error('useSale must be used within SaleProvider')
  return ctx
}

export default SaleContext
