import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ChevronDown, Copy, GripVertical, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { QuestionType } from '../../../api/types'
import { Switch } from '../../../components/ui'
import { GROUP_LABELS, QUESTION_TYPES, TYPE_META, isChoice } from '../../../lib/questionTypes'
import { cn } from '../../../lib/utils'
import { changeType, type DraftQuestion } from './draft'
import OptionsEditor from './OptionsEditor'

function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
  autoFocus,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  autoFocus?: boolean
  maxLength?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      className={cn('w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-stone-400', className)}
    />
  )
}

function TypeSelect({ value, onChange }: { value: QuestionType; onChange: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const meta = TYPE_META[value]
  const groups = Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-graphite/10 bg-graphite/[0.04] py-1.5 pl-1.5 pr-3 text-sm font-semibold text-stone-800 transition hover:border-graphite/20"
      >
        <span className={cn('grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br text-milk', meta.color)}>
          <meta.icon className="h-3.5 w-3.5" />
        </span>
        {meta.label}
        <ChevronDown className={cn('h-4 w-4 text-stone-500 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute left-0 top-11 z-30 grid w-[min(92vw,30rem)] grid-cols-2 gap-x-2 p-2"
          >
            {groups.map((g) => (
              <div key={g} className="mb-1">
                <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">{GROUP_LABELS[g]}</div>
                {QUESTION_TYPES.filter((t) => t.group === g).map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      onChange(t.type)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
                      t.type === value ? 'bg-rust-500/15 text-graphite' : 'text-stone-700 hover:bg-graphite/[0.06]',
                    )}
                  >
                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br text-milk', t.color)}>
                      <t.icon className="h-3.5 w-3.5" />
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  min?: number
  max?: number
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="number"
        className="field"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: number
  options: number[]
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="field appearance-none" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => (
          <option key={o} value={o} className="bg-milk">
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Компактное превью ответа в свёрнутой карточке. */
function MiniPreview({ q }: { q: DraftQuestion }) {
  if (isChoice(q.type)) {
    return (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {q.options.slice(0, 5).map((o) => (
          <span key={o.key} className="rounded-lg border border-graphite/10 bg-graphite/[0.03] px-2.5 py-1 text-xs text-stone-700">
            {o.label || '—'}
          </span>
        ))}
        {q.options.length > 5 && <span className="px-1 py-1 text-xs text-stone-500">+{q.options.length - 5}</span>}
        {q.allowOther && (
          <span className="rounded-lg border border-dashed border-graphite/15 px-2.5 py-1 text-xs italic text-stone-600">Другое…</span>
        )}
      </div>
    )
  }
  if (q.type === 'RATING') {
    return (
      <div className="mt-3 flex gap-1">
        {Array.from({ length: q.maxValue ?? 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 text-amber-600/70" />
        ))}
      </div>
    )
  }
  if (q.type === 'SCALE') {
    const min = q.minValue ?? 0
    const max = q.maxValue ?? 10
    return (
      <div className="mt-3 flex gap-1">
        {Array.from({ length: max - min + 1 }).map((_, i) => (
          <span key={i} className="grid h-6 w-6 place-items-center rounded-md border border-graphite/10 text-[10px] text-stone-600">
            {min + i}
          </span>
        ))}
      </div>
    )
  }
  if (q.type === 'YES_NO') {
    return (
      <div className="mt-3 flex gap-2 text-xs">
        <span className="rounded-lg border border-graphite/10 px-3 py-1 text-stone-700">Да</span>
        <span className="rounded-lg border border-graphite/10 px-3 py-1 text-stone-700">Нет</span>
      </div>
    )
  }
  return <div className="mt-3 h-8 max-w-sm rounded-lg border border-dashed border-graphite/10" />
}

export default function QuestionCard({
  question: q,
  index,
  active,
  error,
  onActivate,
  onChange,
  onDuplicate,
  onDelete,
}: {
  question: DraftQuestion
  index: number
  active: boolean
  error?: string
  onActivate: () => void
  onChange: (q: DraftQuestion) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.key })
  const meta = TYPE_META[q.type]
  const [showDescription, setShowDescription] = useState(!!q.description)
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...q, ...patch })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-20')}
    >
      <div
        onMouseDown={() => !active && onActivate()}
        onFocusCapture={() => !active && onActivate()}
        className={cn(
          'group relative rounded-2xl border transition-all duration-300',
          active
            ? 'border-rust-600/40 bg-milk/80 shadow-glow backdrop-blur-xl'
            : 'cursor-pointer border-graphite/10 bg-graphite/[0.03] backdrop-blur-xl hover:border-graphite/20 hover:bg-graphite/[0.05]',
          isDragging && 'rotate-[0.6deg] scale-[1.02] shadow-2xl shadow-rust-900/50',
          error && 'border-rose-500/50',
        )}
      >
        {/* полоска активной карточки */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              className="absolute bottom-4 left-0 top-4 w-1 origin-top rounded-r-full bg-rust-600"
            />
          )}
        </AnimatePresence>

        <div className="flex gap-2 p-4 sm:p-5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onMouseDown={(e) => e.stopPropagation()}
            className="-ml-1 mt-0.5 h-fit cursor-grab touch-none rounded-lg p-1 text-stone-600 transition hover:bg-graphite/5 hover:text-stone-700 active:cursor-grabbing"
            title="Перетащите, чтобы изменить порядок"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            {!active ? (
              <div>
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-milk', meta.color)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className={cn('font-semibold', q.title ? 'text-stone-900' : 'italic text-stone-500')}>
                      <span className="mr-1.5 text-stone-500">{index + 1}.</span>
                      {q.title || 'Вопрос без текста'}
                      {q.required && <span className="ml-1 text-rose-600">*</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">{meta.label}</div>
                  </div>
                </div>
                <MiniPreview q={q} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-rust-700">Вопрос {index + 1}</span>
                    <TypeSelect value={q.type} onChange={(t) => onChange(changeType(q, t))} />
                  </div>
                </div>

                <AutoTextarea
                  value={q.title}
                  onChange={(title) => set({ title })}
                  placeholder="Введите текст вопроса"
                  autoFocus={!q.title}
                  maxLength={1000}
                  className="text-lg font-semibold text-graphite"
                />

                {showDescription ? (
                  <AutoTextarea
                    value={q.description ?? ''}
                    onChange={(description) => set({ description })}
                    placeholder="Пояснение к вопросу (необязательно)"
                    className="text-sm text-stone-700"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDescription(true)}
                    className="text-xs font-semibold text-stone-500 transition hover:text-rust-700"
                  >
                    + Добавить пояснение
                  </button>
                )}

                <div className="border-t border-graphite/5 pt-4">
                  {isChoice(q.type) && (
                    <>
                      <OptionsEditor
                        type={q.type}
                        options={q.options}
                        allowOther={q.allowOther}
                        onChange={(options) => set({ options })}
                        onAllowOtherChange={(allowOther) => set({ allowOther })}
                      />
                      {q.type === 'MULTIPLE_CHOICE' && (
                        <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
                          <NumberField label="Мин. выбрать" value={q.minSelections} min={0} onChange={(v) => set({ minSelections: v })} />
                          <NumberField label="Макс. выбрать" value={q.maxSelections} min={0} onChange={(v) => set({ maxSelections: v })} />
                        </div>
                      )}
                    </>
                  )}

                  {q.type === 'RATING' && (
                    <div className="flex flex-wrap items-end gap-6">
                      <div className="w-32">
                        <SelectField label="Звёзд" value={q.maxValue ?? 5} options={[3, 4, 5, 6, 7, 8, 9, 10]} onChange={(v) => set({ maxValue: v })} />
                      </div>
                      <div className="flex gap-1 pb-2">
                        {Array.from({ length: q.maxValue ?? 5 }).map((_, i) => (
                          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.03 }}>
                            <Star className="h-6 w-6 fill-amber-600/20 text-amber-600" />
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === 'SCALE' && (
                    <div className="space-y-4">
                      <div className="grid max-w-md grid-cols-2 gap-3">
                        <SelectField label="От" value={q.minValue ?? 0} options={[0, 1]} onChange={(v) => set({ minValue: v })} />
                        <SelectField label="До" value={q.maxValue ?? 10} options={[3, 4, 5, 6, 7, 8, 9, 10]} onChange={(v) => set({ maxValue: v })} />
                      </div>
                      <div className="grid max-w-md grid-cols-2 gap-3">
                        <label>
                          <span className="label">Подпись слева</span>
                          <input className="field" value={q.minLabel ?? ''} maxLength={128} placeholder="Плохо" onChange={(e) => set({ minLabel: e.target.value })} />
                        </label>
                        <label>
                          <span className="label">Подпись справа</span>
                          <input className="field" value={q.maxLabel ?? ''} maxLength={128} placeholder="Отлично" onChange={(e) => set({ maxLabel: e.target.value })} />
                        </label>
                      </div>
                      {(q.minValue ?? 0) === 0 && (q.maxValue ?? 10) === 10 && (
                        <p className="text-xs text-emerald-700/80">✓ Шкала 0–10: в аналитике автоматически посчитается NPS</p>
                      )}
                    </div>
                  )}

                  {q.type === 'NUMBER' && (
                    <div className="grid max-w-md grid-cols-2 gap-3">
                      <NumberField label="Минимум" value={q.minValue} onChange={(v) => set({ minValue: v })} />
                      <NumberField label="Максимум" value={q.maxValue} onChange={(v) => set({ maxValue: v })} />
                    </div>
                  )}

                  {q.type === 'YES_NO' && <MiniPreview q={q} />}
                  {q.type === 'DATE' && <p className="text-sm text-stone-500">Респондент выберет дату в календаре</p>}

                  {['SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER'].includes(q.type) && (
                    <label className={cn('block max-w-md', q.type === 'NUMBER' && 'mt-3')}>
                      <span className="label">Подсказка в поле</span>
                      <input
                        className="field"
                        value={q.placeholder ?? ''}
                        maxLength={255}
                        placeholder="Например: Введите ваш ответ"
                        onChange={(e) => set({ placeholder: e.target.value })}
                      />
                    </label>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-graphite/5 pt-4">
                  <div className="w-auto">
                    <Switch checked={q.required} onChange={(required) => set({ required })} label="Обязательный вопрос" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onDuplicate}
                      title="Дублировать"
                      className="rounded-lg p-2 text-stone-600 transition hover:bg-graphite/10 hover:text-graphite"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      title="Удалить"
                      className="rounded-lg p-2 text-stone-600 transition hover:bg-rose-500/15 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 text-xs font-medium text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
