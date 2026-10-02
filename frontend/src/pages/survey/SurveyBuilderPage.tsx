import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToVerticalAxis } from './builder/dndModifiers'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, CloudOff, Eye, Loader2, Plus, Settings2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { surveyApi } from '../../api/api'
import { toApiError } from '../../api/client'
import type { QuestionType } from '../../api/types'
import SurveyRunner from '../../components/SurveyRunner'
import { Button, Modal } from '../../components/ui'
import { plural } from '../../lib/utils'
import { applyServerIds, duplicateQuestion, newQuestion, toDraft, toPreview, toRequest, type Draft, type DraftQuestion } from './builder/draft'
import QuestionCard from './builder/QuestionCard'
import SettingsPanel from './builder/SettingsPanel'
import TypePalette from './builder/TypePalette'
import { useSurveyContext } from './SurveyLayout'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
const AUTOSAVE_DELAY = 1000

function SaveIndicator({ state, message, onRetry }: { state: SaveState; message?: string; onRetry: () => void }) {
  const content = {
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: 'Все изменения сохранены', cls: 'text-emerald-700' },
    dirty: { icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />, text: 'Есть изменения…', cls: 'text-amber-700' },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Сохранение…', cls: 'text-stone-700' },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: message ?? 'Не сохранено', cls: 'text-rose-700' },
  }[state]
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state + (message ?? '')}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`flex max-w-full items-center gap-1.5 text-xs font-semibold ${content.cls}`}
      >
        {content.icon}
        <span className="truncate">{content.text}</span>
        {state === 'error' && (
          <button onClick={onRetry} className="ml-1 shrink-0 underline underline-offset-2 hover:text-graphite">
            Повторить
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default function SurveyBuilderPage() {
  const { survey, setSurvey, flushRef, publishErrors, setPublishErrors } = useSurveyContext()
  const [draft, setDraft] = useState<Draft>(() => toDraft(survey))
  const [activeKey, setActiveKey] = useState<string | null>(draft.questions[0]?.key ?? null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string>()
  const [serverErrors, setServerErrors] = useState<Record<string, string> | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const draftRef = useRef(draft)
  draftRef.current = draft
  const versionRef = useRef(survey.version)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number>()
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  // версия может поменяться снаружи (публикация/закрытие в шапке)
  useEffect(() => {
    versionRef.current = survey.version
  }, [survey.version])

  const doSave = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    const sent = draftRef.current
    setSaveState('saving')
    try {
      const saved = await surveyApi.update(survey.id, toRequest(sent, versionRef.current))
      versionRef.current = saved.version
      setDraft((cur) => applyServerIds(cur, sent, saved))
      setSurvey(saved)
      setServerErrors(null)
      setPublishErrors(null)
      setSaveError(undefined)
      setSaveState(dirtyRef.current ? 'dirty' : 'saved')
    } catch (e) {
      dirtyRef.current = true
      const err = toApiError(e)
      setSaveState('error')
      if (err.code === 'VALIDATION_FAILED' && err.details) {
        setServerErrors(err.details)
        setSaveError(Object.values(err.details)[0])
      } else {
        setSaveError(err.message)
      }
      throw e
    }
  }, [survey.id, setSurvey, setPublishErrors])

  const enqueueSave = useCallback(() => {
    const run = queueRef.current.then(doSave)
    queueRef.current = run.catch(() => undefined)
    return run
  }, [doSave])

  const flush = useCallback(async () => {
    window.clearTimeout(timerRef.current)
    await enqueueSave()
  }, [enqueueSave])

  useEffect(() => {
    flushRef.current = flush
    return () => {
      flushRef.current = null
    }
  }, [flush, flushRef])

  // при уходе со страницы досохраняем, а при закрытии вкладки — предупреждаем
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (dirtyRef.current) {
        window.clearTimeout(timerRef.current)
        enqueueSave().catch(() => undefined)
      }
    }
  }, [enqueueSave])

  const update = useCallback(
    (fn: (d: Draft) => Draft) => {
      setDraft((d) => fn(d))
      dirtyRef.current = true
      setSaveState('dirty')
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => enqueueSave().catch(() => undefined), AUTOSAVE_DELAY)
    },
    [enqueueSave],
  )

  const patch = (p: Partial<Draft>) => update((d) => ({ ...d, ...p }))
  const updateQuestion = (q: DraftQuestion) =>
    update((d) => ({ ...d, questions: d.questions.map((x) => (x.key === q.key ? q : x)) }))

  const addQuestion = (type: QuestionType) => {
    const q = newQuestion(type)
    update((d) => {
      const idx = d.questions.findIndex((x) => x.key === activeKey)
      const questions = [...d.questions]
      questions.splice(idx === -1 ? questions.length : idx + 1, 0, q)
      return { ...d, questions }
    })
    setActiveKey(q.key)
    setPaletteOpen(false)
    setTimeout(() => document.getElementById(`q-${q.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  const removeQuestion = (key: string) => {
    const current = draftRef.current.questions
    const idx = current.findIndex((x) => x.key === key)
    const rest = current.filter((x) => x.key !== key)
    if (activeKey === key) setActiveKey(rest[Math.max(0, idx - 1)]?.key ?? null)
    update((d) => ({ ...d, questions: d.questions.filter((x) => x.key !== key) }))
  }

  const duplicate = (q: DraftQuestion) => {
    const copy = duplicateQuestion(q)
    update((d) => {
      const idx = d.questions.findIndex((x) => x.key === q.key)
      const questions = [...d.questions]
      questions.splice(idx + 1, 0, copy)
      return { ...d, questions }
    })
    setActiveKey(copy.key)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    update((d) => {
      const from = d.questions.findIndex((q) => q.key === active.id)
      const to = d.questions.findIndex((q) => q.key === over.id)
      return { ...d, questions: arrayMove(d.questions, from, to) }
    })
  }

  // ошибки валидации сервера: "questions[2].options" -> ошибка карточки №3
  const errorsByIndex = useMemo(() => {
    const src = serverErrors ?? publishErrors
    const map: Record<number, string> = {}
    if (!src) return map
    for (const [k, v] of Object.entries(src)) {
      const m = /^questions\[(\d+)]/.exec(k)
      if (m) map[Number(m[1])] ??= v
    }
    return map
  }, [serverErrors, publishErrors])
  const generalError = (serverErrors ?? publishErrors)?.questions ?? (serverErrors ?? publishErrors)?.title

  const preview = useMemo(() => (previewOpen ? toPreview(draft) : null), [previewOpen, draft])

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
      {/* палитра типов (десктоп) */}
      <aside className="hidden xl:block">
        <div className="glass sticky top-6 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-graphite">
            <Plus className="h-4 w-4 text-rust-700" /> Добавить вопрос
          </div>
          <TypePalette onAdd={addQuestion} />
        </div>
      </aside>

      {/* центр — анкета */}
      <section className="min-w-0">
        <div className="sticky top-[61px] z-20 -mx-1 mb-4 flex items-center justify-between gap-3 bg-milk/70 px-1 py-2 backdrop-blur-xl lg:top-0">
          <SaveIndicator state={saveState} message={saveError} onRetry={() => flush().catch(() => undefined)} />
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" className="xl:hidden" icon={<Settings2 className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
              Настройки
            </Button>
            <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setPreviewOpen(true)}>
              Предпросмотр
            </Button>
          </div>
        </div>

        {survey.responseCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex gap-3 rounded-2xl border border-amber-600/20 bg-amber-500/10 p-4 text-sm text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              У анкеты уже {survey.responseCount} {plural(survey.responseCount, ['ответ', 'ответа', 'ответов'])}. Изменять тексты
              безопасно, но удаление вопроса или варианта удалит связанные с ним ответы. Для крупных изменений лучше{' '}
              <b>дублировать анкету</b>.
            </div>
          </motion.div>
        )}

        {/* заголовок анкеты */}
        <div
          className="glass relative mb-4 overflow-hidden p-6"
          style={{ boxShadow: `inset 0 3px 0 0 ${draft.accentColor}` }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-25 blur-3xl transition-colors duration-700"
            style={{ background: draft.accentColor }}
          />
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Название анкеты"
            maxLength={255}
            className="relative w-full bg-transparent text-2xl font-extrabold tracking-tight text-graphite outline-none placeholder:text-stone-400 sm:text-3xl"
          />
          <textarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Описание — расскажите респонденту, зачем эта анкета"
            rows={2}
            maxLength={5000}
            className="relative mt-2 w-full resize-none bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400"
          />
          {generalError && <p className="relative mt-2 text-xs font-medium text-rose-700">{generalError}</p>}
        </div>

        {draft.questions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-dashed border-graphite/10 p-10 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rust-500 text-milk shadow-glow"
            >
              <Sparkles className="h-6 w-6" />
            </motion.div>
            <h3 className="text-lg font-bold text-graphite">Добавьте первый вопрос</h3>
            <p className="mt-1 text-sm text-stone-600">Выберите тип вопроса — например, «Один вариант» или «Оценка звёздами»</p>
            <div className="mx-auto mt-6 max-w-2xl text-left">
              <TypePalette onAdd={addQuestion} compact />
            </div>
          </motion.div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={draft.questions.map((q) => q.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {draft.questions.map((q, i) => (
                    <motion.div
                      key={q.key}
                      id={`q-${q.key}`}
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    >
                      <QuestionCard
                        question={q}
                        index={i}
                        active={activeKey === q.key}
                        error={errorsByIndex[i]}
                        onActivate={() => setActiveKey(q.key)}
                        onChange={updateQuestion}
                        onDuplicate={() => duplicate(q)}
                        onDelete={() => removeQuestion(q.key)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}

        {draft.questions.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-graphite/10 py-5 text-sm font-semibold text-stone-600 transition hover:border-rust-600/40 hover:bg-rust-500/5 hover:text-rust-800"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-graphite/5 transition group-hover:rotate-90 group-hover:bg-rust-500/20">
                <Plus className="h-4 w-4" />
              </span>
              Добавить вопрос
            </button>
          </div>
        )}
      </section>

      {/* настройки (десктоп) */}
      <aside className="hidden xl:block">
        <div className="glass sticky top-6 p-5">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-graphite">
            <Settings2 className="h-4 w-4 text-rust-700" /> Настройки анкеты
          </div>
          <SettingsPanel draft={draft} onChange={patch} />
        </div>
      </aside>

      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Добавить вопрос" description="Выберите тип нового вопроса" size="lg">
        <TypePalette onAdd={addQuestion} compact />
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Настройки анкеты">
        <SettingsPanel draft={draft} onChange={patch} />
      </Modal>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Предпросмотр" description="Так анкету увидит лид. Ответы не сохраняются." size="xl">
        {preview && (
          <div className="relative -mx-6 -my-5 min-h-[520px] overflow-hidden">
            <SurveyRunner survey={preview} preview onSubmit={async () => undefined} embedded />
          </div>
        )}
      </Modal>
    </div>
  )
}
