import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { apiGet, apiPost } from '../lib/api'
import type { AuthAccount } from '../types'

interface AuthContextValue {
  account: AuthAccount | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('jwt')
    if (!stored) { setIsLoading(false); return }
    setToken(stored)
    apiGet<AuthAccount>('/auth/me')
      .then(acc => setAccount(acc))
      .catch(() => {
        localStorage.removeItem('jwt')
        setToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiPost<{ access_token: string; user: AuthAccount }>('/auth/login', { email, password })
    localStorage.setItem('jwt', data.access_token)
    setToken(data.access_token)
    setAccount(data.user)
  }, [])

  const register = useCallback(async (email: string, username: string, password: string) => {
    await apiPost('/auth/register', { email, username, password })
    await login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('jwt')
    setToken(null)
    setAccount(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ account, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
