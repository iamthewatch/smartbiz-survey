import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Mail, Phone, Star, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { analyticsApi } from '../api/api'
import { errorMessage } from '../api/client'
import type { AnswerView } from '../api/types'
import { TYPE_META, isChoice } from '../lib/questionTypes'
import { useAsync } from '../lib/useAsync'
import { cn, formatDateTime, formatDuration } from '../lib/utils'
import { ConfirmDialog, Spinner } from './ui'

function AnswerValue({ a }: { a: AnswerView }) {
  if (!a.answered) return <span className="text-sm italic text-stone-600">Без ответа</span>
  if (isChoice(a.type)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {a.selectedOptions.map((o) => (
          <span key={o} className="rounded-lg border border-rust-600/30 bg-rust-500/15 px-2.5 py-1 text-sm text-rust-900">
            {o}
          </span>
        ))}
        {a.otherText && (
          <span className="rounded-lg border border-dashed border-rust-600/40 bg-rust-500/10 px-2.5 py-1 text-sm text-rust-900">
            Другое: {a.otherText}
          </span>
        )}
      </div>
    )
  }
  if (a.type === 'RATING') {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: a.maxValue ?? 5 }).map((_, i) => (
          <Star key={i} className={cn('h-5 w-5', i < (a.numberValue ?? 0) ? 'fill-amber-600 text-amber-600' : 'text-stone-700')} />
        ))}
        <span className="ml-2 text-sm font-bold text-graphite">
          {a.numberValue}/{a.maxValue}
        </span>
      </div>
    )
  }
  if (a.type === 'SCALE') {
    return (
      <span className="text-2xl font-extrabold text-graphite">
        {a.numberValue}
        <span className="text-sm font-medium text-stone-500"> / {a.maxValue}</span>
      </span>
    )
  }
  if (a.type === 'YES_NO') {
    return (
      <span
        className={cn(
          'rounded-lg px-3 py-1 text-sm font-bold',
          a.numberValue === 1 ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700',
        )}
      >
        {a.display}
      </span>
    )
  }
  return <p className="whitespace-pre-wrap text-sm text-stone-800">{a.display}</p>
}

export default function ResponseDrawer({
  responseId,
  onClose,
  onDeleted,
}: {
  responseId: number | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const { data, loading } = useAsync(
    () => (responseId ? analyticsApi.response(responseId) : Promise.resolve(null)),
    [responseId],
  )
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!responseId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [responseId, onClose])

  const remove = async () => {
    if (!responseId) return
    setDeleting(true)
    try {
      await analyticsApi.removeResponse(responseId)
      toast.success('Ответ удалён')
      setConfirm(false)
      onClose()
      onDeleted?.()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <>
      <AnimatePresence>
        {responseId && (
          <div className="fixed inset-0 z-40">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-graphite/10 bg-milk/95 backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-graphite/5 p-6">
                {data ? (
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-rust-700">Ответ #{data.id}</div>
                    <h2 className="mt-1 truncate text-xl font-bold text-graphite">
                      {data.lead ? (
                        <Link to={`/leads/${data.lead.id}`} className="hover:text-rust-800" onClick={onClose}>
                          {data.lead.fullName}
                        </Link>
                      ) : (
                        'Анонимный респондент'
                      )}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                      {data.lead?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {data.lead.email}
                        </span>
                      )}
                      {data.lead?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {data.lead.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDateTime(data.submittedAt)} · {formatDuration(data.durationSeconds)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div />
                )}
                <button onClick={onClose} className="rounded-lg p-1.5 text-stone-600 hover:bg-graphite/10 hover:text-graphite">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading || !data ? (
                  <div className="flex justify-center py-20">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.answers.map((a, i) => {
                      const meta = TYPE_META[a.type]
                      return (
                        <motion.div
                          key={a.questionId}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-2xl border border-graphite/5 bg-graphite/[0.03] p-4"
                        >
                          <div className="mb-2 flex items-start gap-2">
                            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-gradient-to-br text-milk', meta.color)}>
                              <meta.icon className="h-3 w-3" />
                            </span>
                            <div className="text-sm font-semibold text-stone-700">
                              {i + 1}. {a.title}
                            </div>
                          </div>
                          <div className="pl-7">
                            <AnswerValue a={a} />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {data && (
                <div className="border-t border-graphite/5 p-4">
                  <button
                    onClick={() => setConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" /> Удалить ответ
                  </button>
                </div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={deleting}
        title="Удалить ответ?"
        message="Ответ будет удалён из аналитики. Если лид отвечал по персональной ссылке, он сможет пройти анкету заново."
      />
    </>,
    document.body,
  )
}
