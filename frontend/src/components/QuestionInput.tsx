import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { QuestionDto } from '../api/types'
import { cn } from '../lib/utils'

export interface AnswerState {
  optionIds: number[]
  otherSelected?: boolean
  otherText?: string
  textValue?: string
  numberValue?: number
}

export const emptyAnswer = (): AnswerState => ({ optionIds: [] })

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function ChoiceCard({
  letter,
  label,
  selected,
  multi,
  accent,
  onClick,
  index,
}: {
  letter: string
  label: string
  selected: boolean
  multi: boolean
  accent: string
  onClick: () => void
  index: number
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors duration-200',
        selected ? 'text-graphite' : 'border-graphite/10 bg-graphite/[0.03] text-stone-800 hover:border-graphite/25 hover:bg-graphite/[0.06]',
      )}
      style={selected ? { borderColor: accent, background: `${accent}33`, boxShadow: `0 0 0 1px ${accent}, 0 8px 30px -10px ${accent}` } : undefined}
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center border text-xs font-bold transition-colors',
          multi ? 'rounded-md' : 'rounded-full',
          selected ? 'border-transparent text-graphite' : 'border-graphite/20 text-stone-600 group-hover:border-graphite/40',
        )}
        style={selected ? { background: accent } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span key="l" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              {letter}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="flex-1">{label}</span>
    </motion.button>
  )
}

export default function QuestionInput({
  question: q,
  value,
  onChange,
  accent,
  onAutoAdvance,
  onEnter,
  keyboard,
}: {
  question: QuestionDto
  value: AnswerState
  onChange: (v: AnswerState) => void
  accent: string
  /** вызывается после выбора, когда можно автоматически перейти дальше */
  onAutoAdvance?: () => void
  onEnter?: () => void
  /** включить горячие клавиши A/B/C и 1-9 (только для активного вопроса в пошаговом режиме) */
  keyboard?: boolean
}) {
  const otherRef = useRef<HTMLInputElement>(null)
  const [hoverStar, setHoverStar] = useState<number | null>(null)
  const multi = q.type === 'MULTIPLE_CHOICE'

  const toggleOption = (id: number) => {
    if (multi) {
      const has = value.optionIds.includes(id)
      const next = has ? value.optionIds.filter((x) => x !== id) : [...value.optionIds, id]
      if (!has && q.maxSelections && next.length + (value.otherSelected ? 1 : 0) > q.maxSelections) return
      onChange({ ...value, optionIds: next })
    } else {
      onChange({ ...value, optionIds: [id], otherSelected: false })
      onAutoAdvance?.()
    }
  }

  const toggleOther = () => {
    if (multi) {
      onChange({ ...value, otherSelected: !value.otherSelected })
    } else {
      onChange({ ...value, optionIds: [], otherSelected: true })
    }
    setTimeout(() => otherRef.current?.focus(), 50)
  }

  // горячие клавиши для вариантов (A, B, C…) и шкал (цифры)
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
        const idx = LETTERS.indexOf(e.key.toUpperCase())
        if (idx >= 0 && idx < q.options.length) toggleOption(q.options[idx].id!)
        else if (idx === q.options.length && q.allowOther) toggleOther()
      }
      if (q.type === 'YES_NO') {
        if (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'д') pick(1)
        if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'н') pick(0)
      }
      if ((q.type === 'RATING' || q.type === 'SCALE') && /^\d$/.test(e.key)) {
        const n = Number(e.key)
        const min = q.minValue ?? (q.type === 'RATING' ? 1 : 0)
        const max = q.maxValue ?? (q.type === 'RATING' ? 5 : 10)
        if (n >= min && n <= max) pick(n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pick = (n: number) => {
    onChange({ ...value, numberValue: n })
    onAutoAdvance?.()
  }

  // Enter — дальше; в многострочном поле — Ctrl/Cmd + Enter
  const textKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    if (e.target instanceof HTMLTextAreaElement && !(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    onEnter?.()
  }

  const lineInput =
    'w-full border-b-2 border-graphite/15 bg-transparent pb-2 pt-1 text-2xl font-medium text-graphite outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]'

  switch (q.type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-2">
          {multi && (q.minSelections || q.maxSelections) && (
            <p className="mb-3 text-sm text-stone-600">
              {q.minSelections && q.maxSelections
                ? `Выберите от ${q.minSelections} до ${q.maxSelections}`
                : q.minSelections
                  ? `Выберите минимум ${q.minSelections}`
                  : `Выберите не более ${q.maxSelections}`}
            </p>
          )}
          {multi && !q.minSelections && !q.maxSelections && <p className="mb-3 text-sm text-stone-600">Можно выбрать несколько</p>}
          {q.options.map((o, i) => (
            <ChoiceCard
              key={o.id}
              index={i}
              letter={LETTERS[i]}
              label={o.label}
              multi={multi}
              accent={accent}
              selected={value.optionIds.includes(o.id!)}
              onClick={() => toggleOption(o.id!)}
            />
          ))}
          {q.allowOther && (
            <>
              <ChoiceCard
                index={q.options.length}
                letter={LETTERS[q.options.length]}
                label="Другое"
                multi={multi}
                accent={accent}
                selected={!!value.otherSelected}
                onClick={toggleOther}
              />
              <AnimatePresence>
                {value.otherSelected && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <input
                      ref={otherRef}
                      value={value.otherText ?? ''}
                      maxLength={2000}
                      onChange={(e) => onChange({ ...value, otherText: e.target.value })}
                      onKeyDown={textKeyDown}
                      placeholder="Ваш вариант ответа…"
                      className="mt-2 w-full rounded-xl border border-graphite/15 bg-graphite/[0.04] px-4 py-3 text-base text-graphite outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )

    case 'DROPDOWN':
      return (
        <div className="relative max-w-md">
          <select
            value={value.optionIds[0] ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value)
              onChange({ ...value, optionIds: e.target.value ? [id] : [] })
            }}
            className="w-full appearance-none rounded-xl border border-graphite/15 bg-graphite/[0.04] px-4 py-3.5 pr-10 text-lg text-graphite outline-none transition focus:border-[var(--accent)]"
          >
            <option value="" className="bg-milk">
              Выберите вариант…
            </option>
            {q.options.map((o) => (
              <option key={o.id} value={o.id!} className="bg-milk">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
        </div>
      )

    case 'RATING': {
      const max = q.maxValue ?? 5
      const current = hoverStar ?? value.numberValue ?? 0
      return (
        <div className="flex flex-wrap gap-2" onMouseLeave={() => setHoverStar(null)}>
          {Array.from({ length: max }).map((_, i) => {
            const n = i + 1
            const filled = n <= current
            return (
              <motion.button
                key={n}
                type="button"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 15 }}
                whileHover={{ scale: 1.2, rotate: -8 }}
                whileTap={{ scale: 0.85 }}
                onMouseEnter={() => setHoverStar(n)}
                onClick={() => pick(n)}
                className="p-1"
                aria-label={`${n}`}
              >
                <Star
                  className={cn('h-10 w-10 transition-colors duration-150 sm:h-12 sm:w-12', filled ? 'fill-amber-600 text-amber-600 drop-shadow-[0_0_12px_rgba(251,191,36,.6)]' : 'text-stone-600')}
                />
              </motion.button>
            )
          })}
        </div>
      )
    }

    case 'SCALE': {
      const min = q.minValue ?? 0
      const max = q.maxValue ?? 10
      const count = max - min + 1
      const isNps = min === 0 && max === 10
      const npsColor = (n: number) => (n <= 6 ? '#f43f5e' : n <= 8 ? '#f59e0b' : '#10b981')
      return (
        <div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {Array.from({ length: count }).map((_, i) => {
              const n = min + i
              const selected = value.numberValue === n
              const color = isNps ? npsColor(n) : accent
              return (
                <motion.button
                  key={n}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pick(n)}
                  className={cn(
                    'aspect-square max-h-14 rounded-xl border text-sm font-bold transition-colors sm:text-base',
                    selected ? 'text-graphite' : 'border-graphite/10 bg-graphite/[0.04] text-stone-700 hover:border-graphite/30',
                  )}
                  style={selected ? { background: color, borderColor: color, boxShadow: `0 8px 24px -6px ${color}` } : undefined}
                >
                  {n}
                </motion.button>
              )
            })}
          </div>
          {(q.minLabel || q.maxLabel) && (
            <div className="mt-3 flex justify-between text-sm text-stone-600">
              <span>{q.minLabel}</span>
              <span>{q.maxLabel}</span>
            </div>
          )}
        </div>
      )
    }

    case 'YES_NO':
      return (
        <div className="grid max-w-md grid-cols-2 gap-3">
          {[
            { v: 1, label: 'Да', icon: ThumbsUp, color: '#10b981' },
            { v: 0, label: 'Нет', icon: ThumbsDown, color: '#f43f5e' },
          ].map(({ v, label, icon: Icon, color }, i) => {
            const selected = value.numberValue === v
            return (
              <motion.button
                key={v}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => pick(v)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border py-6 text-lg font-bold transition-colors',
                  selected ? 'text-graphite' : 'border-graphite/10 bg-graphite/[0.04] text-stone-700 hover:border-graphite/30',
                )}
                style={selected ? { background: `${color}30`, borderColor: color, boxShadow: `0 10px 30px -10px ${color}` } : undefined}
              >
                <motion.span animate={selected ? { rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5 }}>
                  <Icon className="h-8 w-8" style={{ color: selected ? color : undefined }} />
                </motion.span>
                {label}
              </motion.button>
            )
          })}
        </div>
      )

    case 'LONG_TEXT':
      return (
        <div>
          <textarea
            value={value.textValue ?? ''}
            maxLength={10000}
            rows={4}
            onChange={(e) => onChange({ ...value, textValue: e.target.value })}
            onKeyDown={textKeyDown}
            placeholder={q.placeholder || 'Напишите ваш ответ…'}
            className="w-full resize-none rounded-xl border border-graphite/15 bg-graphite/[0.04] px-4 py-3 text-lg text-graphite outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
          />
          <p className="mt-2 text-xs text-stone-500">Ctrl + Enter — продолжить</p>
        </div>
      )

    case 'NUMBER':
      return (
        <input
          type="number"
          inputMode="decimal"
          value={value.numberValue ?? ''}
          min={q.minValue ?? undefined}
          max={q.maxValue ?? undefined}
          onChange={(e) => onChange({ ...value, numberValue: e.target.value === '' ? undefined : Number(e.target.value) })}
          onKeyDown={textKeyDown}
          placeholder={q.placeholder || 'Введите число'}
          className={lineInput}
        />
      )

    case 'DATE':
      return (
        <input
          type="date"
          value={value.textValue ?? ''}
          onChange={(e) => onChange({ ...value, textValue: e.target.value })}
          onKeyDown={textKeyDown}
          className={cn(lineInput, 'max-w-xs')}
        />
      )

    default:
      return (
        <input
          type={q.type === 'EMAIL' ? 'email' : q.type === 'PHONE' ? 'tel' : 'text'}
          inputMode={q.type === 'PHONE' ? 'tel' : q.type === 'EMAIL' ? 'email' : undefined}
          value={value.textValue ?? ''}
          maxLength={1000}
          onChange={(e) => onChange({ ...value, textValue: e.target.value })}
          onKeyDown={textKeyDown}
          placeholder={q.placeholder || (q.type === 'EMAIL' ? 'name@example.com' : q.type === 'PHONE' ? '+7 (___) ___-__-__' : 'Ваш ответ…')}
          className={lineInput}
        />
      )
  }
}

/** Клиентская проверка ответа (дублирует серверную, чтобы ошибка была видна сразу). */
export function validateAnswer(q: QuestionDto, a: AnswerState | undefined): string | null {
  const empty = isEmptyAnswer(q, a)
  if (empty) return q.required ? 'Это обязательный вопрос' : null
  const v = a!
  switch (q.type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'DROPDOWN': {
      if (v.otherSelected && !v.otherText?.trim()) return 'Напишите свой вариант'
      const total = v.optionIds.length + (v.otherSelected ? 1 : 0)
      if (q.type === 'MULTIPLE_CHOICE') {
        if (q.minSelections && total < q.minSelections) return `Выберите минимум ${q.minSelections}`
        if (q.maxSelections && total > q.maxSelections) return `Можно выбрать не более ${q.maxSelections}`
      }
      return null
    }
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.textValue!.trim()) ? null : 'Введите корректный email'
    case 'PHONE': {
      const digits = v.textValue!.replace(/\D/g, '')
      return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()-]+$/.test(v.textValue!.trim())
        ? null
        : 'Введите корректный номер телефона'
    }
    case 'NUMBER':
      if (q.minValue != null && v.numberValue! < q.minValue) return `Значение должно быть не меньше ${q.minValue}`
      if (q.maxValue != null && v.numberValue! > q.maxValue) return `Значение должно быть не больше ${q.maxValue}`
      return null
    default:
      return null
  }
}

export function isEmptyAnswer(q: QuestionDto, a: AnswerState | undefined) {
  if (!a) return true
  switch (q.type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'DROPDOWN':
      // выбранное «Другое» без текста — не пустой ответ, а ошибка «напишите свой вариант»
      return a.optionIds.length === 0 && !a.otherSelected
    case 'RATING':
    case 'SCALE':
    case 'YES_NO':
    case 'NUMBER':
      return a.numberValue == null || Number.isNaN(a.numberValue)
    default:
      return !a.textValue?.trim()
  }
}
