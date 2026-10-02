import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  ClipboardList,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Link2,
  Trash2,
  Users,
  MessageSquareText,
  HelpCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { surveyApi } from '../api/api'
import { errorMessage } from '../api/client'
import type { SurveyStatus, SurveySummary } from '../api/types'
import CreateSurveyModal from '../components/CreateSurveyModal'
import { Button, ConfirmDialog, EmptyState, PageHeader, StatusBadge, Tabs } from '../components/ui'
import { useAsync, useDebounced } from '../lib/useAsync'
import { copyToClipboard, publicSurveyUrl, timeAgo } from '../lib/utils'

type Filter = 'ALL' | SurveyStatus

function CardMenu({ survey, onDuplicate, onDelete }: { survey: SurveySummary; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const items = [
    { icon: Pencil, label: 'Конструктор', action: () => navigate(`/surveys/${survey.id}/edit`) },
    ...(survey.status === 'PUBLISHED'
      ? [{
          icon: Link2,
          label: 'Скопировать ссылку',
          action: async () => {
            if (await copyToClipboard(publicSurveyUrl(survey.slug))) toast.success('Ссылка скопирована')
          },
        }]
      : []),
    { icon: BarChart3, label: 'Аналитика', action: () => navigate(`/surveys/${survey.id}/analytics`) },
    { icon: Copy, label: 'Дублировать', action: onDuplicate },
    { icon: Trash2, label: 'Удалить', action: onDelete, danger: true },
  ]

  return (
    <div ref={ref} className="relative" onClick={(e) => e.preventDefault()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-stone-600 transition hover:bg-graphite/10 hover:text-graphite"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 top-9 z-20 w-52 origin-top-right p-1.5"
          >
            {items.map(({ icon: Icon, label, action, danger }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false)
                  action()
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  danger ? 'text-rose-700 hover:bg-rose-500/15' : 'text-stone-700 hover:bg-graphite/[0.07] hover:text-graphite'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SurveysPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const { data, loading, reload } = useAsync(
    () => surveyApi.list({ status: filter === 'ALL' ? undefined : filter, q: q || undefined }),
    [filter, q],
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<SurveySummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  const duplicate = async (s: SurveySummary) => {
    try {
      const copy = await surveyApi.duplicate(s.id)
      toast.success('Копия создана')
      navigate(`/surveys/${copy.id}/edit`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await surveyApi.remove(toDelete.id)
      toast.success('Анкета удалена')
      setToDelete(null)
      reload(true)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Анкеты"
        subtitle="Создавайте опросники, отправляйте их лидам и анализируйте ответы"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Новая анкета
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<Filter>
          layoutId="survey-filter"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'ALL', label: 'Все' },
            { value: 'PUBLISHED', label: 'Активные' },
            { value: 'DRAFT', label: 'Черновики' },
            { value: 'CLOSED', label: 'Закрытые' },
          ]}
        />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input className="field pl-10" placeholder="Поиск по названию" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-52" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title={q || filter !== 'ALL' ? 'Ничего не найдено' : 'Здесь пока пусто'}
          description={
            q || filter !== 'ALL'
              ? 'Попробуйте изменить фильтр или поисковый запрос'
              : 'Создайте первую анкету — это займёт пару минут'
          }
          action={
            !q && filter === 'ALL' ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                Создать анкету
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {data?.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), type: 'spring', stiffness: 260, damping: 24 }}
              >
                <Link
                  to={`/surveys/${s.id}/edit`}
                  className="glass group relative flex h-full flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-graphite/20 hover:shadow-glow"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 opacity-80"
                    style={{ background: `linear-gradient(90deg, ${s.accentColor ?? '#C65A1E'}, transparent)` }}
                  />
                  <div
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
                    style={{ background: s.accentColor ?? '#C65A1E' }}
                  />
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <StatusBadge status={s.status} />
                    <CardMenu survey={s} onDuplicate={() => duplicate(s)} onDelete={() => setToDelete(s)} />
                  </div>
                  <h3 className="line-clamp-2 text-lg font-bold text-graphite">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-stone-600">{s.description || 'Без описания'}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-graphite/5 pt-4 text-center">
                    {[
                      { icon: HelpCircle, v: s.questionCount, l: 'вопросов' },
                      { icon: Users, v: s.invitationCount, l: 'приглашено' },
                      { icon: MessageSquareText, v: s.responseCount, l: 'ответов' },
                    ].map(({ icon: Icon, v, l }) => (
                      <div key={l}>
                        <div className="flex items-center justify-center gap-1 text-base font-bold text-graphite">
                          <Icon className="h-3.5 w-3.5 text-stone-500" />
                          {v}
                        </div>
                        <div className="text-[11px] text-stone-500">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-stone-500">Изменена {timeAgo(s.updatedAt)}</div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateSurveyModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Удалить анкету?"
        message={
          <>
            Анкета «{toDelete?.title}» будет удалена вместе со всеми приглашениями и{' '}
            <b className="text-graphite">{toDelete?.responseCount} ответами</b>. Это действие нельзя отменить.
          </>
        }
      />
    </>
  )
}
