import { useCallback, useEffect, useRef, useState } from 'react'
import { toApiError } from '../api/client'
import type { ApiError } from '../api/types'

/**
 * Простой хук загрузки данных: data / loading / error + reload.
 * Игнорирует ответы устаревших запросов (если deps сменились быстрее, чем пришёл ответ).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const callId = useRef(0)

  const run = useCallback(async (silent = false) => {
    const id = ++callId.current
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await fn()
      if (id === callId.current) setData(result)
    } catch (e) {
      if (id === callId.current) setError(toApiError(e))
    } finally {
      if (id === callId.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, setData, loading, error, reload: run }
}

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
