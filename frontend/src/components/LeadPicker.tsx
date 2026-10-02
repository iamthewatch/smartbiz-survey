import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Search, User, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { leadApi } from '../api/api'
import type { LeadBrief } from '../api/types'
import { useAsync, useDebounced } from '../lib/useAsync'
import { cn } from '../lib/utils'

/** Выбор одного лида для фильтра аналитики («Все лиды» = null). */
export default function LeadPicker({ value, onChange }: { value: LeadBrief | null; onChange: (lead: LeadBrief | null) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const ref = useRef<HTMLDivElement>(null)
  const { data, loading } = useAsync(() => (open ? leadApi.search(q, 0, 30) : Promise.resolve(null)), [open, q])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative w-full sm:w-72">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm transition',
          value ? 'border-rust-600/40 bg-rust-500/10 text-graphite' : 'border-graphite/10 bg-graphite/[0.04] text-stone-700 hover:border-graphite/20',
        )}
      >
        {value ? <User className="h-4 w-4 text-rust-700" /> : <Users className="h-4 w-4 text-stone-500" />}
        <span className="flex-1 truncate font-medium">{value ? value.fullName : 'Все лиды'}</span>
        {value ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
            }}
            className="rounded p-0.5 text-stone-600 hover:bg-graphite/10 hover:text-graphite"
          >
            <X className="h-4 w-4" />
          </span>
        ) : (
          <ChevronDown className={cn('h-4 w-4 text-stone-500 transition', open && 'rotate-180')} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 top-12 z-30 w-full min-w-[18rem] p-2"
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input autoFocus className="field h-9 pl-9" placeholder="Найти лида" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-graphite/[0.06]"
              >
                <Users className="h-4 w-4 text-stone-500" /> Все лиды
              </button>
              {loading && !data ? (
                <div className="px-3 py-4 text-center text-xs text-stone-500">Загрузка…</div>
              ) : (
                data?.items.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      onChange({ id: l.id, fullName: l.fullName, email: l.email, phone: l.phone, company: l.company })
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-graphite/[0.06]',
                      value?.id === l.id && 'bg-rust-500/15',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-800">{l.fullName}</span>
                      <span className="block truncate text-xs text-stone-500">{l.email ?? l.phone ?? l.company ?? ''}</span>
                    </span>
                    {l.responseCount > 0 && <span className="shrink-0 text-xs text-stone-500">{l.responseCount} отв.</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
