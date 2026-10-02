import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/api'
import { setUnauthorizedHandler, tokenStorage } from '../api/client'
import type { UserInfo } from '../api/types'

interface AuthState {
  user: UserInfo | null
  initializing: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [initializing, setInitializing] = useState(true)
  const navigate = useNavigate()

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      if (!window.location.pathname.startsWith('/login')) {
        navigate('/login', { replace: true, state: { from: window.location.pathname } })
      }
    })
  }, [navigate])

  useEffect(() => {
    if (!tokenStorage.get()) {
      setInitializing(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setInitializing(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    tokenStorage.set(res.token)
    setUser(res.user)
  }, [])

  const value = useMemo(() => ({ user, initializing, login, logout }), [user, initializing, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
