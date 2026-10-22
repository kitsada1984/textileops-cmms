import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeTables } from '../api/realtimeSync'

export default function useEntity(api) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const isMountedRef = useRef(true)

  const load = useCallback(async (filtersOrOptions = {}) => {
    const isSilent = Boolean(filtersOrOptions && filtersOrOptions.silent)
    let queryFilters = filtersOrOptions
    if (isSilent && typeof filtersOrOptions === 'object') {
      const { silent, ...rest } = filtersOrOptions
      queryFilters = rest
    }

    if (!isSilent) setLoading(true)
    setError(null)
    try {
      const res = await api.list(queryFilters)
      if (isMountedRef.current) {
        setData(Array.isArray(res) ? res : res.data || res.items || [])
      }
    } catch(e) {
      if (isMountedRef.current) setError(e.message)
    } finally {
      if (!isSilent && isMountedRef.current) setLoading(false)
    }
  }, [api])

  const realtimeTables = api?.realtimeTables || (api?.tableName ? [api.tableName] : [])

  useRealtimeTables(realtimeTables, () => {
    load({ silent: true })
  }, {
    debounceMs: 250,
    enabled: Array.isArray(realtimeTables) && realtimeTables.length > 0,
    syncOnFocus: true,
  })

  useEffect(() => {
    isMountedRef.current = true
    load()
    return () => {
      isMountedRef.current = false
    }
  }, [load])

  const save = async (item) => {
    const res = item._id || item.id
      ? await api.update(item._id || item.id, item)
      : await api.create(item)
    await load({ silent: true })
    return res
  }

  const remove = async (id) => {
    await api.delete(id)
    await load({ silent: true })
  }

  return { data, loading, error, load, save, remove }
}
