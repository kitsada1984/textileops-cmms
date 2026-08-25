import { useState, useEffect, useCallback } from 'react'

export default function useEntity(api) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async (filters = {}) => {
    setLoading(true); setError(null)
    try {
      const res = await api.list(filters)
      setData(Array.isArray(res) ? res : res.data || res.items || [])
    } catch(e) { setError(e.message) }
    finally    { setLoading(false) }
  }, [api])

  useEffect(() => {
    load()

    let lastFetch = Date.now()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > 8000) {
        lastFetch = Date.now()
        load()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [load])

  const save = async (item) => {
    const res = item._id || item.id
      ? await api.update(item._id || item.id, item)
      : await api.create(item)
    await load()
    return res
  }

  const remove = async (id) => {
    await api.delete(id)
    await load()
  }

  return { data, loading, error, load, save, remove }
}
