import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Globe,
  Link2,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { invitationApi, leadApi } from '../../api/api'
import { errorMessage } from '../../api/client'
import type { Invitation, InvitationStatus, LeadRequest } from '../../api/types'
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, Tabs, Textarea } from '../../components/ui'
import { useAsync, useDebounced } from '../../lib/useAsync'
import { cn, copyToClipboard, invitationUrl, plural, publicSurveyUrl, timeAgo } from '../../lib/utils'
import { useSurveyContext } from './SurveyLayout'

const TEMPLATE_KEY = 'smartbiz-survey.message-template'
const DEFAULT_TEMPLATE = 'Здравствуйте, {имя}! Пожалуйста, ответьте на несколько вопросов — это займёт пару минут: {ссылка}'

const STATUS: Record<InvitationStatus, { label: string; cls: string; icon: typeof Send }> = {
  SENT: { label: 'Отправлено', cls: 'bg-stone-500/15 text-stone-700 border-stone-600/20', icon: Send },
  OPENED: { label: 'Открыто', cls: 'bg-stone-500/15 text-stone-700 border-stone-600/20', icon: Eye },
  COMPLETED: { label: 'Пройдено', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-600/20', icon: CheckCircle2 },
}

function readTemplate() {
  try {
    return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE
  } catch {
    return DEFAULT_TEMPLATE
  }
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyToClipboard(text)) {
          setCopied(true)
          toast.success('Ссылка скопирована')
          setTimeout(() => setCopied(false), 1600)
        }
      }}
      title="Скопировать ссылку"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg p-2 text-sm font-semibold transition',
        copied ? 'text-emerald-700' : 'text-stone-600 hover:bg-graphite/10 hover:text-graphite',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Copy className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </button>
  )
}

function InviteModal({
  open,
  onClose,
  surveyId,
  invitedLeadIds,
  onInvited,
}: {
  open: boolean
  onClose: () => void
  surveyId: number
  invitedLeadIds: Set<number>
  onInvited: () => void
}) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing')
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const { data, loading } = useAsync(() => (open ? leadApi.search(q, 0, 100) : Promise.resolve(null)), [open, q])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [form, setForm] = useState<LeadRequest>({ fullName: '', email: '', phone: '', company: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const leads = data?.items ?? []
  const selectable = leads.filter((l) => !invitedLeadIds.has(l.id))

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const close = () => {
    setSelected(new Set())
    setForm({ fullName: '', email: '', phone: '', company: '' })
    setErrors({})
    onClose()
  }

  const inviteExisting = async () => {
    setSaving(true)
    try {
      const res = await invitationApi.create(surveyId, [...selected])
      toast.success(`Создано ${res.length} ${plural(res.length, ['приглашение', 'приглашения', 'приглашений'])}`)
      onInvited()
      close()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const inviteNew = async () => {
    const errs: Record<string, string> = {}
    if (!form.fullName.trim()) errs.fullName = 'Укажите имя'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Некорректный email'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const inv = await invitationApi.quick(surveyId, form)
      await copyToClipboard(invitationUrl(inv.token))
      toast.success('Лид добавлен, ссылка скопирована в буфер')
      onInvited()
      close()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Пригласить лидов"
      description="Каждый лид получит персональную ссылку — так вы увидите, кто и как ответил"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Отмена
          </Button>
          {tab === 'existing' ? (
            <Button onClick={inviteExisting} loading={saving} disabled={selected.size === 0} icon={<Link2 className="h-4 w-4" />}>
              Создать ссылки {selected.size > 0 && `(${selected.size})`}
            </Button>
          ) : (
            <Button onClick={inviteNew} loading={saving} icon={<UserPlus className="h-4 w-4" />}>
              Добавить и получить ссылку
            </Button>
          )}
        </>
      }
    >
      <div className="mb-5">
        <Tabs
          layoutId="invite-tab"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'existing', label: <><Users className="h-4 w-4" /> Из базы лидов</> },
            { value: 'new', label: <><UserPlus className="h-4 w-4" /> Новый лид</> },
          ]}
        />
      </div>

      {tab === 'existing' ? (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <input className="field pl-10" placeholder="Имя, email, телефон или компания" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          {selectable.length > 0 && (
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-stone-500">Выбрано: {selected.size}</span>
              <button
                className="font-semibold text-rust-700 hover:text-rust-800"
                onClick={() =>
                  setSelected((s) => (selectable.every((l) => s.has(l.id)) ? new Set() : new Set(selectable.map((l) => l.id))))
                }
              >
                {selectable.every((l) => selected.has(l.id)) ? 'Снять все' : 'Выбрать всех'}
              </button>
            </div>
          )}
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {loading && !data ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14" />)
            ) : leads.length === 0 ? (
              <div className="py-10 text-center text-sm text-stone-500">
                {q ? 'Никого не нашли' : 'В базе пока нет лидов.'}{' '}
                <button onClick={() => setTab('new')} className="font-semibold text-rust-700">
                  Добавить нового
                </button>
              </div>
            ) : (
              leads.map((l) => {
                const invited = invitedLeadIds.has(l.id)
                const checked = selected.has(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={invited}
                    onClick={() => toggle(l.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                      checked ? 'border-rust-600/40 bg-rust-500/10' : 'border-transparent hover:bg-graphite/[0.04]',
                      invited && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                        checked ? 'border-rust-600 bg-rust-500' : 'border-graphite/20',
                      )}
                    >
                      {checked && <Check className="h-3.5 w-3.5 text-graphite" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-graphite">{l.fullName}</div>
                      <div className="truncate text-xs text-stone-500">
                        {[l.email, l.phone, l.company].filter(Boolean).join(' · ') || 'Без контактов'}
                      </div>
                    </div>
                    {invited && <span className="text-xs font-semibold text-stone-600">уже приглашён</span>}
                  </button>
                )
              })
            )}
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя *" error={errors.fullName} className="sm:col-span-2">
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} invalid={!!errors.fullName} autoFocus />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={!!errors.email} />
          </Field>
          <Field label="Телефон">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 701 000 00 00" />
          </Field>
          <Field label="Компания" className="sm:col-span-2">
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
        </div>
      )}
    </Modal>
  )
}

export default function SurveySharePage() {
  const { survey } = useSurveyContext()
  const { data: invitations, loading, reload } = useAsync(() => invitationApi.list(survey.id), [survey.id])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Invitation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [template, setTemplate] = useState(readTemplate)
  const [filter, setFilter] = useState<'ALL' | InvitationStatus>('ALL')

  const invitedIds = useMemo(() => new Set((invitations ?? []).map((i) => i.lead.id)), [invitations])
  const stats = useMemo(() => {
    const list = invitations ?? []
    return {
      total: list.length,
      opened: list.filter((i) => i.status !== 'SENT').length,
      completed: list.filter((i) => i.status === 'COMPLETED').length,
    }
  }, [invitations])
  const visible = (invitations ?? []).filter((i) => filter === 'ALL' || i.status === filter)

  const message = (inv: Invitation) =>
    template.replaceAll('{имя}', inv.lead.fullName.split(' ')[0]).replaceAll('{ссылка}', invitationUrl(inv.token))

  const saveTemplate = (v: string) => {
    setTemplate(v)
    try {
      localStorage.setItem(TEMPLATE_KEY, v)
    } catch {
      /* приватный режим — не страшно */
    }
  }

  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await invitationApi.remove(toDelete.id)
      toast.success('Приглашение удалено')
      setToDelete(null)
      reload(true)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const copyAll = async () => {
    const text = visible.map((i) => `${i.lead.fullName} — ${invitationUrl(i.token)}`).join('\n')
    if (await copyToClipboard(text)) toast.success(`Скопировано ссылок: ${visible.length}`)
  }

  return (
    <div className="space-y-6">
      {survey.status !== 'PUBLISHED' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 rounded-2xl border border-amber-600/20 bg-amber-500/10 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            {survey.status === 'DRAFT'
              ? 'Анкета ещё в черновике. Ссылки можно создать заранее, но лиды смогут ответить только после публикации.'
              : 'Приём ответов закрыт — лиды увидят сообщение, что анкета недоступна.'}
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* воронка */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 lg:col-span-2">
          <h3 className="mb-5 font-bold text-graphite">Воронка приглашений</h3>
          <div className="space-y-4">
            {[
              { label: 'Приглашено', value: stats.total, color: 'from-stone-600 to-stone-500' },
              { label: 'Открыли ссылку', value: stats.opened, color: 'from-stone-600 to-rust-500' },
              { label: 'Прошли анкету', value: stats.completed, color: 'from-emerald-600 to-teal-500' },
            ].map((row, i) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-stone-700">{row.label}</span>
                  <span className="font-bold text-graphite">
                    {row.value}
                    {stats.total > 0 && i > 0 && <span className="ml-2 text-xs font-medium text-stone-500">{Math.round((row.value / stats.total) * 100)}%</span>}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-graphite/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: stats.total ? `${(row.value / stats.total) * 100}%` : '0%' }}
                    transition={{ duration: 1, delay: 0.1 + i * 0.15, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* публичная ссылка */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass p-6">
          <h3 className="mb-1 flex items-center gap-2 font-bold text-graphite">
            <Globe className="h-4 w-4 text-rust-700" /> Общая ссылка
          </h3>
          {survey.publicLinkEnabled ? (
            <>
              <p className="mb-4 text-xs text-stone-500">
                Для соцсетей и сайта. {survey.collectContact ? 'Респондент укажет имя и контакты — и станет лидом.' : 'Ответы будут анонимными.'}
              </p>
              <div className="flex items-center gap-1 rounded-xl border border-graphite/10 bg-black/20 py-1 pl-3 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-stone-700">{publicSurveyUrl(survey.slug)}</span>
                <CopyButton text={publicSurveyUrl(survey.slug)} />
              </div>
              <a href={publicSurveyUrl(survey.slug)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-rust-700 hover:text-rust-800">
                Открыть в новой вкладке →
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-600">
              Выключена. Включите её в{' '}
              <Link to="../edit" className="font-semibold text-rust-700 hover:text-rust-800">
                настройках конструктора
              </Link>
              , если нужна одна ссылка для всех.
            </p>
          )}
        </motion.div>
      </div>

      {/* шаблон сообщения */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-graphite">
            <MessageCircle className="h-4 w-4 text-rust-700" /> Текст сообщения
          </h3>
          <span className="text-xs text-stone-500">
            Переменные: <code className="rounded bg-graphite/10 px-1.5 py-0.5 text-rust-800">{'{имя}'}</code>{' '}
            <code className="rounded bg-graphite/10 px-1.5 py-0.5 text-rust-800">{'{ссылка}'}</code>
          </span>
        </div>
        <Textarea rows={2} value={template} onChange={(e) => saveTemplate(e.target.value)} className="min-h-[64px]" />
        <p className="mt-2 text-xs text-stone-500">Используется для кнопок WhatsApp, Telegram и Email у каждого лида</p>
      </motion.div>

      {/* приглашения */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            layoutId="inv-filter"
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: 'ALL', label: `Все ${stats.total}` },
              { value: 'SENT', label: 'Не открыли' },
              { value: 'OPENED', label: 'Открыли' },
              { value: 'COMPLETED', label: `Прошли ${stats.completed}` },
            ]}
          />
          <div className="flex gap-2">
            {visible.length > 0 && (
              <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={copyAll}>
                Копировать все
              </Button>
            )}
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Пригласить лидов
            </Button>
          </div>
        </div>

        {loading && !invitations ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : stats.total === 0 ? (
          <EmptyState
            icon={<Send className="h-7 w-7" />}
            title="Пока никого не пригласили"
            description="Выберите лидов из базы или добавьте нового — для каждого будет создана персональная ссылка."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                Пригласить лидов
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {visible.map((inv, i) => {
                const st = STATUS[inv.status]
                const url = invitationUrl(inv.token)
                const phone = inv.lead.phone?.replace(/\D/g, '')
                return (
                  <motion.div
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <Link to={`/leads/${inv.lead.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rust-500/50 font-bold text-graphite">
                        {inv.lead.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-graphite hover:text-rust-800">{inv.lead.fullName}</div>
                        <div className="truncate text-xs text-stone-500">
                          {[inv.lead.email, inv.lead.phone].filter(Boolean).join(' · ') || 'Без контактов'}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 sm:w-48">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', st.cls)}>
                        <st.icon className="h-3 w-3" /> {st.label}
                      </span>
                      <span className="text-xs text-stone-500">{timeAgo(inv.completedAt ?? inv.openedAt ?? inv.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:justify-end">
                      <CopyButton text={url} />
                      {phone && (
                        <a
                          href={`https://wa.me/${phone}?text=${encodeURIComponent(message(inv))}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Отправить в WhatsApp"
                          className="rounded-lg p-2 text-stone-600 transition hover:bg-emerald-500/15 hover:text-emerald-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message(inv).replace(url, '').trim())}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Отправить в Telegram"
                        className="rounded-lg p-2 text-stone-600 transition hover:bg-stone-500/15 hover:text-stone-700"
                      >
                        <Send className="h-4 w-4" />
                      </a>
                      {inv.lead.email && (
                        <a
                          href={`mailto:${inv.lead.email}?subject=${encodeURIComponent(survey.title)}&body=${encodeURIComponent(message(inv))}`}
                          title="Отправить по email"
                          className="rounded-lg p-2 text-stone-600 transition hover:bg-rust-500/15 hover:text-rust-700"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {inv.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setToDelete(inv)}
                          title="Удалить приглашение"
                          className="rounded-lg p-2 text-stone-500 transition hover:bg-rose-500/15 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} surveyId={survey.id} invitedLeadIds={invitedIds} onInvited={() => reload(true)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Удалить приглашение?"
        message={`Ссылка для «${toDelete?.lead.fullName}» перестанет работать.`}
      />
    </div>
  )
}
