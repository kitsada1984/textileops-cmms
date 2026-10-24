import { useWebBuilderConfig } from '../contexts/WebBuilderConfigContext'

const FIELD_ALIASES = {
  '/workorders': {
    Problem: ['Problem', 'Detail'],
    Detail: ['Detail', 'Problem'],
  },
}

const ROUTE_ALIASES = {
  '/stock-movement': '/stock',
  '/stock': '/stock-movement',
}

function normalizeRoute(route = '') {
  const path = String(route).split('?')[0].replace(/\/+$/, '')
  return path || '/'
}

function findMenu(menus, route) {
  const target = normalizeRoute(route)
  const alias = ROUTE_ALIASES[target]
  return menus.find(m => {
    const r = normalizeRoute(m.route)
    return r === target || (alias && r === alias)
  })
}

function findColumn(menu, route, field) {
  if (!menu || !field) return null
  const fields = [field, ...(FIELD_ALIASES[normalizeRoute(route)]?.[field] || [])]
  return menu.columns?.find(c =>
    fields.some(f => c.field === f || c.field?.toLowerCase() === String(f).toLowerCase())
  ) || null
}

export default function useWebBuilderMenu(route) {
  const { menus } = useWebBuilderConfig()
  const menu = findMenu(menus, route)
  return menu ? menu.columns : null
}

export function useWebBuilderColumn(route, field) {
  const { menus } = useWebBuilderConfig()
  const menu = findMenu(menus, route)
  return findColumn(menu, route, field)
}

export function useFieldOptions(route, field, fallback) {
  const { menus } = useWebBuilderConfig()
  const menu = findMenu(menus, route)
  const col = findColumn(menu, route, field)
  return (col?.type === 'select' && col.options?.length) ? col.options : fallback
}
