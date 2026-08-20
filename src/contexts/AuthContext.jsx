import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// permissions = { menuKey: ["view","add","edit","delete"] }
export const PERM_ACTIONS = ['view', 'add', 'edit', 'delete']

export function canAccess(user, menuKey) {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = user.permissions?.[menuKey]
  return Array.isArray(perms) && perms.length > 0
}

export function hasPerm(user, menuKey, action = 'view') {
  if (!user) return false
  if (user.role === 'admin') return true
  const perms = user.permissions?.[menuKey]
  return Array.isArray(perms) && perms.includes(action)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_user')
      setUser(stored ? JSON.parse(stored) : null)
    } catch {
      setUser(null)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const hash = await hashPassword(password)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, role, status, permissions')
      .eq('username', username.trim().toLowerCase())
      .eq('password_hash', hash)
      .single()

    if (error || !data) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    if (data.status === 'inactive') throw new Error('บัญชีนี้ถูกปิดใช้งาน')

    const info = {
      id: data.id,
      username: data.username,
      full_name: data.full_name || data.username,
      role: data.role,
      permissions: data.permissions || {},
    }
    localStorage.setItem('app_user', JSON.stringify(info))
    setUser(info)
    return info
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('app_user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem('app_user')
    if (!stored) return
    const { id } = JSON.parse(stored)
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, role, status, permissions')
      .eq('id', id)
      .single()
    if (data) {
      const info = {
        id: data.id,
        username: data.username,
        full_name: data.full_name || data.username,
        role: data.role,
        permissions: data.permissions || {},
      }
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
