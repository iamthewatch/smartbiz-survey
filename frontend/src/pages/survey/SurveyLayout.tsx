import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Check, Copy, ExternalLink, Link2, Lock, PenSquare, Rocket, RotateCcw } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { surveyApi } from '../../api/api'
import { errorMessage, toApiError } from '../../api/client'
import type { SurveyDetail } from '../../api/types'
import { Button, ConfirmDialog, EmptyState, PageLoader, StatusBadge } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { cn, copyToClipboard, publicSurveyUrl } from '../../lib/utils'

export interface SurveyContext {
  survey: SurveyDetail
  setSurvey: (s: SurveyDetail) => void
  reload: () => void
  /** конструктор регистрирует здесь функцию «досохранить изменения» перед публикацией */
  flushRef: React.MutableRefObject<(() => Promise<void>) | null>
  /** ошибки валидации публикации по ключам вида questions[2].options */
  publishErrors: Record<string, string> | null
  setPublishErrors: (e: Record<string, string> | null) => void
}

export const useSurveyContext = () => useOutletContext<SurveyContext>()

const TABS = [
  { to: 'edit', label: 'Конструктор', icon: PenSquare },
  { to: 'analytics', label: 'Аналитика', icon: BarChart3 },
]

export default function SurveyLayout() {
  const { id } = useParams()
  const surveyId = Number(id)
  const { data: survey, setData, loading, error, reload } = useAsync(() => surveyApi.get(surveyId), [surveyId])
  const flushRef = useRef<(() => Promise<void>) | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [publishErrors, setPublishErrors] = useState<Record<string, string> | null>(null)

  const setSurvey = useCallback((s: SurveyDetail) => setData(s), [setData])

  const runStatusAction = async (action: 'publish' | 'close' | 'draft') => {
    setBusy(true)
    try {
      await flushRef.current?.()
      const updated =
        action === 'publish'
          ? await surveyApi.publish(surveyId)
          : action === 'close'
            ? await surveyApi.close(surveyId)
            : await surveyApi.toDraft(surveyId)
      setData((prev) => (prev ? { ...prev, ...pickStatus(updated) } : updated))
      setPublishErrors(null)
      if (action === 'publish') {
        const url = publicSurveyUrl(updated.slug)
        toast.success('Анкета опубликована 🚀', {
          description: 'Скопируйте ссылку и отправьте её респондентам',
          action: { label: 'Скопировать', onClick: () => void copyLink(url) },
        })
      }
      if (action === 'close') toast.success('Приём ответов остановлен')
      if (action === 'draft') toast.success('Анкета снова в черновиках')
      setConfirmClose(false)
    } catch (e) {
      const err = toApiError(e)
      if (err.code === 'VALIDATION_FAILED' && err.details) {
        setPublishErrors(err.details)
        toast.error('Анкету нельзя опубликовать', { description: Object.values(err.details)[0] })
      } else {
        toast.error(errorMessage(e))
      }
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async (url: string) => {
    if (await copyToClipboard(url)) toast.success('Ссылка скопирована')
  }

  if (loading && !survey) return <PageLoader />
  if (error || !survey) {
    return (
      <EmptyState
        icon={<Lock className="h-7 w-7" />}
        title="Анкета не найдена"
        description={error?.message}
        action={
          <Link to="/surveys">
            <Button variant="secondary">К списку анкет</Button>
          </Link>
        }
      />
    )
  }

  const ctx: SurveyContext = { survey, setSurvey, reload: () => reload(true), flushRef, publishErrors, setPublishErrors }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Link to="/surveys" className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-600 transition hover:text-graphite">
          <ArrowLeft className="h-4 w-4" /> Все анкеты
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_12px]" style={{ background: survey.accentColor ?? '#C65A1E', color: survey.accentColor ?? '#C65A1E' }} />
              <h1 className="truncate font-display text-3xl font-bold uppercase leading-none tracking-tight text-graphite sm:text-4xl">{survey.title || 'Без названия'}</h1>
              <StatusBadge status={survey.status} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {survey.status === 'DRAFT' && (
              <Button icon={<Rocket className="h-4 w-4" />} loading={busy} onClick={() => runStatusAction('publish')}>
                Опубликовать
              </Button>
            )}
            {survey.status === 'PUBLISHED' && (
              <Button variant="outline" icon={<Lock className="h-4 w-4" />} disabled={busy} onClick={() => setConfirmClose(true)}>
                Закрыть приём ответов
              </Button>
            )}
            {survey.status === 'CLOSED' && (
              <>
                <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} disabled={busy} onClick={() => runStatusAction('draft')}>
                  В черновики
                </Button>
                <Button icon={<Rocket className="h-4 w-4" />} loading={busy} onClick={() => runStatusAction('publish')}>
                  Открыть снова
                </Button>
              </>
            )}
          </div>
        </div>

        {survey.status === 'PUBLISHED' && <SurveyLinkBar url={publicSurveyUrl(survey.slug)} />}

        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-graphite/5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="relative">
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap px-4 pb-3 pt-1 text-sm font-semibold transition-colors',
                    isActive ? 'text-graphite' : 'text-stone-600 hover:text-stone-800',
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                  {isActive && (
                    <motion.span
                      layoutId="survey-tab"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-rust-600"
                    />
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </motion.div>

      <Outlet context={ctx} />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => runStatusAction('close')}
        loading={busy}
        danger={false}
        confirmText="Закрыть"
        title="Закрыть приём ответов?"
        message="Лиды больше не смогут заполнить анкету по ссылкам. Собранные ответы и аналитика сохранятся, анкету можно открыть снова."
      />
    </>
  )
}

function pickStatus(s: SurveyDetail): Partial<SurveyDetail> {
  return { status: s.status, publishedAt: s.publishedAt, closedAt: s.closedAt, version: s.version, updatedAt: s.updatedAt }
}

function SurveyLinkBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (await copyToClipboard(url)) {
      setCopied(true)
      toast.success('Ссылка скопирована')
      setTimeout(() => setCopied(false), 1600)
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex flex-col gap-2 rounded-2xl border border-graphite/10 bg-paper p-2 shadow-card sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
        <Link2 className="h-4 w-4 shrink-0 text-rust-700" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-stone-700">{url}</span>
      </div>
      <div className="flex gap-2">
        <a href={url} target="_blank" rel="noreferrer">
          <Button variant="ghost" icon={<ExternalLink className="h-4 w-4" />}>
            Открыть
          </Button>
        </a>
        <Button onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </Button>
      </div>
    </motion.div>
  )
}
