import axios, { AxiosError } from 'axios'
import type { ApiError } from './types'

const TOKEN_KEY = 'smartbiz-survey.token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20000,
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token && !config.url?.startsWith('/public')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      tokenStorage.clear()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

/** Превращает любую ошибку запроса в понятный объект ApiError. */
export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiError | undefined
    if (data?.message) return data
    if (!e.response) {
      return { status: 0, code: 'NETWORK', message: 'Нет связи с сервером. Проверьте подключение.' }
    }
    return { status: e.response.status, code: 'HTTP_' + e.response.status, message: 'Ошибка сервера' }
  }
  return { status: 0, code: 'UNKNOWN', message: 'Что-то пошло не так' }
}

export function errorMessage(e: unknown): string {
  const err = toApiError(e)
  if (err.details) {
    const first = Object.values(err.details)[0]
    if (first) return first
  }
  return err.message
}
