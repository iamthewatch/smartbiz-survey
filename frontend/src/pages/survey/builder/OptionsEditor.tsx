import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import type { QuestionType } from '../../../api/types'
import { cn, uid } from '../../../lib/utils'
import type { DraftOption } from './draft'

function Marker({ type, index }: { type: QuestionType; index: number }) {
  if (type === 'MULTIPLE_CHOICE') return <span className="h-4 w-4 shrink-0 rounded-[5px] border-2 border-stone-500" />
  if (type === 'DROPDOWN') return <span className="w-4 shrink-0 text-center text-xs font-bold text-stone-500">{index + 1}.</span>
  return <span className="h-4 w-4 shrink-0 rounded-full border-2 border-stone-500" />
}

function OptionRow({
  option,
  index,
  type,
  canDelete,
  autoFocus,
  onChange,
  onDelete,
  onEnter,
  onBackspaceEmpty,
  onPasteLines,
}: {
  option: DraftOption
  index: number
  type: QuestionType
  canDelete: boolean
  autoFocus: boolean
  onChange: (label: string) => void
  onDelete: () => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  onPasteLines: (lines: string[]) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.key })
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter()
    } else if (e.key === 'Backspace' && option.label === '' && canDelete) {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  // вставка списка из нескольких строк превращается в несколько вариантов
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length > 1) {
      e.preventDefault()
      onPasteLines(lines)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          'group/opt flex items-center gap-2 rounded-xl py-1 pr-1',
          isDragging && 'relative z-10 bg-milk shadow-xl ring-1 ring-rust-600/40',
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-stone-600 opacity-0 transition group-hover/opt:opacity-100 active:cursor-grabbing"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Marker type={type} index={index} />
        <input
          ref={inputRef}
          value={option.label}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={`Вариант ${index + 1}`}
          maxLength={500}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 hover:border-graphite/10 focus:border-rust-600/60"
        />
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-stone-500 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-700 group-hover/opt:opacity-100"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function OptionsEditor({
  type,
  options,
  allowOther,
  onChange,
  onAllowOtherChange,
}: {
  type: QuestionType
  options: DraftOption[]
  allowOther: boolean
  onChange: (options: DraftOption[]) => void
  onAllowOtherChange: (v: boolean) => void
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const insertAfter = (index: number, labels: string[] = ['']) => {
    const created = labels.map((label) => ({ key: uid(), id: null, label }))
    setFocusKey(created[created.length - 1].key)
    const next = [...options]
    next.splice(index + 1, 0, ...created)
    onChange(next)
  }

  const removeAt = (index: number) => {
    setFocusKey(options[index - 1]?.key ?? options[index + 1]?.key ?? null)
    onChange(options.filter((_, i) => i !== index))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = options.findIndex((o) => o.key === active.id)
    const to = options.findIndex((o) => o.key === over.id)
    onChange(arrayMove(options, from, to))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={options.map((o) => o.key)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {options.map((o, i) => (
              <OptionRow
                key={o.key}
                option={o}
                index={i}
                type={type}
                canDelete={options.length > 1}
                autoFocus={focusKey === o.key}
                onChange={(label) => onChange(options.map((x) => (x.key === o.key ? { ...x, label } : x)))}
                onDelete={() => removeAt(i)}
                onEnter={() => insertAfter(i)}
                onBackspaceEmpty={() => removeAt(i)}
                onPasteLines={(lines) => {
                  // первая строка — в текущий вариант, остальные — новыми вариантами
                  const next = options.map((x) => (x.key === o.key ? { ...x, label: lines[0] } : x))
                  const created = lines.slice(1).map((label) => ({ key: uid(), id: null, label }))
                  next.splice(i + 1, 0, ...created)
                  onChange(next)
                }}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      <AnimatePresence>
        {allowOther && type !== 'DROPDOWN' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-1 pl-7 pr-1"
          >
            <Marker type={type} index={options.length} />
            <span className="flex-1 border-b border-dashed border-graphite/15 py-1.5 text-sm italic text-stone-600">
              Другое: свой вариант ответа…
            </span>
            <button
              type="button"
              onClick={() => onAllowOtherChange(false)}
              className="rounded-lg p-1.5 text-stone-500 transition hover:bg-rose-500/15 hover:text-rose-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-sm">
        <button
          type="button"
          onClick={() => insertAfter(options.length - 1)}
          disabled={options.length >= 100}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-rust-700 transition hover:bg-rust-500/10 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Добавить вариант
        </button>
        {!allowOther && type !== 'DROPDOWN' && (
          <>
            <span className="text-stone-600">или</span>
            <button
              type="button"
              onClick={() => onAllowOtherChange(true)}
              className="rounded-lg px-2 py-1.5 font-semibold text-stone-600 transition hover:bg-graphite/5 hover:text-stone-800"
            >
              добавить «Другое» (свой ответ)
            </button>
          </>
        )}
      </div>
      <p className="mt-2 pl-9 text-xs text-stone-600">Enter — новый вариант · можно вставить список из буфера обмена</p>
    </div>
  )
}
