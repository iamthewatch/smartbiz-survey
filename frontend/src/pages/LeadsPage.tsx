import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, FileUp, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { leadApi } from '../api/api'
import { errorMessage, toApiError } from '../api/client'
import type { Lead, LeadRequest, LeadSource } from '../api/types'
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Textarea } from '../components/ui'
import { useAsync, useDebounced } from '../lib/useAsync'
import { formatDate, plural } from '../lib/utils'

const SOURCE_LABEL: Record<LeadSource, string> = { MANUAL: 'Вручную', IMPORT: 'Импорт', PUBLIC_LINK: 'Публичная ссылка' }
const EMPTY: LeadRequest = { fullName: '', email: '', phone: '', company: '', note: '' }

export function LeadFormModal({
  open,
  onClose,
  lead,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  lead?: Lead | null
  onSaved: () => void
}) {
  const [form, setForm] = useState<LeadRequest>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [initFor, setInitFor] = useState<number | null | undefined>(undefined)

  // заполняем форму при открытии
  const key = open ? (lead?.id ?? null) : undefined
  if (key !== initFor) {
    setInitFor(key)
    if (open) {
      setForm(lead ? { fullName: lead.fullName, email: lead.email ?? '', phone: lead.phone ?? '', company: lead.company ?? '', note: lead.note ?? '' } : EMPTY)
      setErrors({})
    }
  }

  const save = async () => {
    const errs: Record<string, string> = {}
    if (!form.fullName.trim()) errs.fullName = 'Укажите имя'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Некорректный email'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      if (lead) await leadApi.update(lead.id, form)
      else await leadApi.create(form)
      toast.success(lead ? 'Лид обновлён' : 'Лид добавлен')
      onSaved()
      onClose()
    } catch (e) {
      const err = toApiError(e)
      if (err.details) setErrors(err.details)
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof LeadRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Редактировать лида' : 'Новый лид'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} loading={saving}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя *" error={errors.fullName} className="sm:col-span-2">
          <Input value={form.fullName} onChange={set('fullName')} invalid={!!errors.fullName} autoFocus />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} />
        </Field>
        <Field label="Телефон">
          <Input value={form.phone} onChange={set('phone')} placeholder="+7 701 000 00 00" />
        </Field>
        <Field label="Компания" className="sm:col-span-2">
          <Input value={form.company} onChange={set('company')} />
        </Field>
        <Field label="Заметка" className="sm:col-span-2">
          <Textarea value={form.note} onChange={set('note')} rows={3} />
        </Field>
      </div>
    </Modal>
  )
}

/** Импорт: каждая строка — «Имя; email; телефон; компания» (разделитель ; , или Tab). */
function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const rows: LeadRequest[] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ','
      const [fullName = '', email = '', phone = '', company = ''] = line.split(sep).map((s) => s.trim())
      return { fullName, email: email || undefined, phone: phone || undefined, company: company || undefined }
    })
    .filter((r) => r.fullName)

  const save = async () => {
    setSaving(true)
    try {
      const res = await leadApi.bulk(rows)
      toast.success(`Импортировано ${res.created} ${plural(res.created, ['лид', 'лида', 'лидов'])}`)
      setText('')
      onDone()
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Импорт лидов"
      description="Вставьте список — по одному лиду в строке. Можно скопировать прямо из Excel."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} loading={saving} disabled={rows.length === 0}>
            Импортировать {rows.length > 0 && `(${rows.length})`}
          </Button>
        </>
      }
    >
      <Textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Иван Петров; ivan@mail.kz; +77011234567; ТОО Ромашка\nАйгерим Садыкова; aigerim@mail.kz; +77017654321'}
        className="font-mono text-xs"
      />
      <p className="mt-2 text-xs text-stone-500">Формат: Имя; Email; Телефон; Компания — разделитель «;», табуляция или запятая</p>
      {rows.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-graphite/5">
          <table className="w-full text-xs">
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b border-graphite/5 last:border-0">
                  <td className="px-3 py-2 font-semibold text-graphite">{r.fullName}</td>
                  <td className="px-3 py-2 text-stone-600">{r.email}</td>
                  <td className="px-3 py-2 text-stone-600">{r.phone}</td>
                  <td className="px-3 py-2 text-stone-600">{r.company}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export default function LeadsPage() {
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [page, setPage] = useState(0)
  const { data, loading, reload } = useAsync(() => leadApi.search(q, page, 20), [q, page])
  const [editing, setEditing] = useState<Lead | null | undefined>(undefined)
  const [importOpen, setImportOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await leadApi.remove(toDelete.id)
      toast.success('Лид удалён')
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
        title="Лиды"
        subtitle={data ? `${data.total} ${plural(data.total, ['контакт', 'контакта', 'контактов'])} в базе` : 'База контактов для рассылки анкет'}
        actions={
          <>
            <Button variant="secondary" icon={<FileUp className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Импорт
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing(null)}>
              Добавить лида
            </Button>
          </>
        }
      />

      <div className="relative mb-6 sm:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <input
          className="field pl-10"
          placeholder="Имя, email, телефон, компания"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
        />
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={q ? 'Никого не нашли' : 'Лидов пока нет'}
          description={q ? 'Попробуйте другой запрос' : 'Добавьте лидов вручную или импортируйте список — затем отправьте им анкету.'}
          action={
            !q && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing(null)}>
                Добавить лида
              </Button>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite/5 text-left text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-5 py-3 font-semibold">Лид</th>
                  <th className="px-5 py-3 font-semibold">Контакты</th>
                  <th className="px-5 py-3 font-semibold">Источник</th>
                  <th className="px-5 py-3 font-semibold">Ответов</th>
                  <th className="px-5 py-3 font-semibold">Добавлен</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {data?.items.map((l, i) => (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="group border-b border-graphite/[0.03] transition hover:bg-graphite/[0.03]"
                    >
                      <td className="px-5 py-3">
                        <Link to={`/leads/${l.id}`} className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft font-bold text-graphite">
                            {l.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-graphite group-hover:text-rust-800">{l.fullName}</div>
                            {l.company && <div className="truncate text-xs text-stone-500">{l.company}</div>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-stone-700">
                        <div className="truncate">{l.email ?? '—'}</div>
                        <div className="truncate text-xs text-stone-500">{l.phone}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge>{SOURCE_LABEL[l.source]}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className={l.responseCount ? 'font-bold text-emerald-700' : 'text-stone-500'}>{l.responseCount}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-stone-600">{formatDate(l.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                          <button onClick={() => setEditing(l)} className="rounded-lg p-2 text-stone-600 hover:bg-graphite/10 hover:text-graphite" title="Редактировать">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setToDelete(l)} className="rounded-lg p-2 text-stone-600 hover:bg-rose-500/15 hover:text-rose-700" title="Удалить">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-graphite/5 px-5 py-3 text-sm text-stone-600">
              <span>
                Стр. {data.page + 1} из {data.totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <LeadFormModal open={editing !== undefined} lead={editing} onClose={() => setEditing(undefined)} onSaved={() => reload(true)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => reload(true)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Удалить лида?"
        message={
          <>
            «{toDelete?.fullName}» будет удалён вместе с приглашениями и его ответами ({toDelete?.responseCount ?? 0}). Это действие нельзя
            отменить.
          </>
        }
      />
    </>
  )
}
