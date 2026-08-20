import { useMemo } from 'react'

export const INIT_FS = { sortKey: '', sortDir: 'asc', filters: {} }

export default function useFilterSort(data, state) {
  return useMemo(() => {
    let result = [...data]

    // Apply column filters
    const filters = state?.filters ?? {}
    Object.entries(filters).forEach(([key, val]) => {
      if (!val || (Array.isArray(val) && val.length === 0)) return
      if (Array.isArray(val)) {
        const lower = val.map(v => String(v).toLowerCase())
        result = result.filter(row => lower.includes(String(row[key] ?? '').toLowerCase()))
      } else {
        const q = String(val).toLowerCase()
        result = result.filter(row => String(row[key] ?? '').toLowerCase().includes(q))
      }
    })

    // Apply sort
    const { sortKey, sortDir } = state ?? {}
    if (sortKey) {
      result.sort((a, b) => {
        const va = a[sortKey]
        const vb = b[sortKey]
        const na = parseFloat(va)
        const nb = parseFloat(vb)
        let cmp
        if (!isNaN(na) && !isNaN(nb)) {
          cmp = na - nb
        } else {
          cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { sensitivity: 'base', numeric: true })
        }
        return sortDir === 'desc' ? -cmp : cmp
      })
    }

    return result
  }, [data, state])
}
