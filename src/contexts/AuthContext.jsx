import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { d1, setAuthToken } from '../api/d1Client'
import { getActiveDbProvider } from '../api/dbClient'

const AuthContext = createContext(null)

export async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// permissions = { menuKey: ["view","add","edit","delete"] }
export const PERM_ACTIONS = ['view', 'add', 'edit', 'delete']

// D1 เก็บ permissions เป็น TEXT (JSON string) — parse ให้เป็น object ทุกครั้งที่อ่านจาก DB
export function parsePermissions(p) {
  if (typeof p === 'string') {
    try { p = JSON.parse(p) } catch { p = {} }
  }
  return p && typeof p === 'object' ? p : {}
}

// คืน user ที่ permissions เป็น object พร้อมใช้เสมอ
export function normalizeUser(u) {
  if (!u) return u
  return { ...u, permissions: parsePermissions(u.permissions) }
}

export function canAccess(user, menuKey) {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = parsePermissions(user.permissions)?.[menuKey]
  return Array.isArray(perms) && perms.length > 0
}

export function hasPerm(user, menuKey, action = 'view') {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = parsePermissions(user.permissions)?.[menuKey]
  return Array.isArray(perms) && perms.includes(action)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_user')
      // Stale session from the pre-D1 version: has user profile but no auth
      // token — every API call would silently 401 and show empty pages.
      if (stored && getActiveDbProvider() === 'd1' && !localStorage.getItem('textileops_auth_token')) {
        localStorage.removeItem('app_user')
        setUser(null)
        return
      }
      setUser(stored ? normalizeUser(JSON.parse(stored)) : null)
    } catch {
      setUser(null)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    if (getActiveDbProvider() === 'd1') {
      // D1-native auth via Pages Function
      const res = await fetch('/api/d1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || !result.ok) {
        throw new Error(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }
      setAuthToken(result.token)
      localStorage.setItem('app_user', JSON.stringify(normalizeUser(result.user)))
      setUser(normalizeUser(result.user))
      return result.user
    }

    // Supabase fallback path
    const hash = await hashPassword(password)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, role, status, permissions')
      .eq('username', username.trim().toLowerCase())
      .eq('password_hash', hash)
      .single()

    if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    if (data.status === 'inactive') throw new Error('บัญชีนี้ถูกปิดใช้งาน')

    const info = normalizeUser({
      id: data.id,
      username: data.username,
      full_name: data.full_name || data.username,
      role: data.role,
      permissions: data.permissions,
    })
    localStorage.setItem('app_user', JSON.stringify(info))
    setUser(info)
    return info
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('app_user')
    setAuthToken('')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem('app_user')
    if (!stored) return
    const { id } = JSON.parse(stored)

    if (getActiveDbProvider() === 'd1') {
      try {
        const res = await fetch('/api/d1/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('textileops_auth_token') || ''}` },
        })
        if (res.ok) {
          const result = await res.json()
          if (result.ok && result.user) {
            const info = normalizeUser(result.user)
            localStorage.setItem('app_user', JSON.stringify(info))
            setUser(info)
            return
          }
        }
      } catch {}
      return
    }

    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, role, status, permissions')
      .eq('id', id)
      .single()
    if (data) {
      const info = normalizeUser({
        id: data.id,
        username: data.username,
        full_name: data.full_name || data.username,
        role: data.role,
        permissions: data.permissions,
      })
      localStorage.setItem('app_user', JSON.stringify(info))
      setUser(info)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
