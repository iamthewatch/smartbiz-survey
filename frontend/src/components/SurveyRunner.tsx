import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, Check, CornerDownLeft, Send } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { toApiError } from '../api/client'
import type { AnswerInput, PublicSurvey, SubmitRequest } from '../api/types'
import { cn } from '../lib/utils'
import QuestionInput, { emptyAnswer, isEmptyAnswer, validateAnswer, type AnswerState } from './QuestionInput'
import { AnimatedBackground, Logo } from './ui'

type Stage = 'welcome' | 'contact' | 'questions' | 'done'

function Confetti({ accent }: { accent: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 900,
        y: -Math.random() * 500 - 150,
        r: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
        color: [accent, '#111111', '#BFC3C8', '#D9D9D6', accent, '#111111'][i % 6],
        delay: Math.random() * 0.2,
        round: Math.random() > 0.5,
      })),
    [accent],
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: p.size, height: p.size * (p.round ? 1 : 0.5), background: p.color, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 700], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 2.6, delay: p.delay, ease: [0.15, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  )
}

const slide = {
  enter: (dir: number) => ({ y: dir > 0 ? 60 : -60, opacity: 0, filter: 'blur(6px)' }),
  center: { y: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (dir: number) => ({ y: dir > 0 ? -60 : 60, opacity: 0, filter: 'blur(6px)' }),
}

export default function SurveyRunner({
  survey,
  onSubmit,
  preview,
  embedded,
}: {
  survey: PublicSurvey
  onSubmit: (req: SubmitRequest) => Promise<{ thankYouMessage?: string } | void>
  preview?: boolean
  /** внутри модалки предпросмотра — без фиксированного фона на весь экран */
  embedded?: boolean
}) {
  const accent = survey.accentColor || '#C65A1E'
  const questions = survey.questions
  const [stage, setStage] = useState<Stage>('welcome')
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [contact, setContact] = useState({ fullName: '', email: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [thanks, setThanks] = useState(survey.thankYouMessage)
  const startedAt = useRef<string>()
  const advanceTimer = useRef<number>()

  const answeredCount = questions.filter((q) => !isEmptyAnswer(q, answers[q.id!])).length
  const progress =
    stage === 'done' ? 1 : stage !== 'questions' ? 0 : survey.oneQuestionPerPage ? step / questions.length : answeredCount / Math.max(1, questions.length)

  const setAnswer = (qid: number, a: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [qid]: a }))
    setErrors((prev) => {
      if (!prev['q_' + qid]) return prev
      const next = { ...prev }
      delete next['q_' + qid]
      return next
    })
  }

  const start = () => {
    startedAt.current = new Date().toISOString()
    setDir(1)
    setStage(survey.collectContact ? 'contact' : 'questions')
  }

  const submitContact = () => {
    const e: Record<string, string> = {}
    if (!contact.fullName.trim()) e.fullName = 'Представьтесь, пожалуйста'
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) e.email = 'Некорректный email'
    setErrors(e)
    if (Object.keys(e).length === 0) {
      setDir(1)
      setStage('questions')
    }
  }

  const buildRequest = (): SubmitRequest => {
    const list: AnswerInput[] = []
    for (const q of questions) {
      const a = answers[q.id!]
      if (isEmptyAnswer(q, a)) continue
      list.push({
        questionId: q.id!,
        optionIds: a.optionIds.length ? a.optionIds : undefined,
        otherText: a.otherSelected ? a.otherText?.trim() : undefined,
        textValue: a.textValue?.trim() || undefined,
        numberValue: a.numberValue,
      })
    }
    return {
      startedAt: startedAt.current,
      contact: survey.collectContact ? { fullName: contact.fullName.trim(), email: contact.email.trim() || undefined, phone: contact.phone.trim() || undefined } : undefined,
      answers: list,
    }
  }

  const submit = useCallback(async () => {
    // финальная проверка всех вопросов
    const errs: Record<string, string> = {}
    questions.forEach((q) => {
      const err = validateAnswer(q, answers[q.id!])
      if (err) errs['q_' + q.id] = err
    })
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstIdx = questions.findIndex((q) => errs['q_' + q.id])
      if (survey.oneQuestionPerPage) {
        setDir(-1)
        setStep(firstIdx)
      } else {
        document.getElementById(`rq-${questions[firstIdx].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await onSubmit(buildRequest())
      if (res && res.thankYouMessage) setThanks(res.thankYouMessage)
      setDir(1)
      setStage('done')
    } catch (e) {
      const err = toApiError(e)
      if (err.details) {
        setErrors(err.details)
        const firstIdx = questions.findIndex((q) => err.details!['q_' + q.id])
        if (firstIdx >= 0 && survey.oneQuestionPerPage) {
          setDir(-1)
          setStep(firstIdx)
        }
        if (err.details['contact.fullName']) setStage('contact')
      }
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, questions, contact])

  const next = () => {
    window.clearTimeout(advanceTimer.current)
    const q = questions[step]
    const err = validateAnswer(q, answers[q.id!])
    if (err) {
      setErrors((p) => ({ ...p, ['q_' + q.id]: err }))
      return
    }
    if (step < questions.length - 1) {
      setDir(1)
      setStep(step + 1)
    } else {
      submit()
    }
  }

  const back = () => {
    window.clearTimeout(advanceTimer.current)
    if (step === 0) {
      setDir(-1)
      setStage(survey.collectContact ? 'contact' : 'welcome')
      return
    }
    setDir(-1)
    setStep(step - 1)
  }

  const autoAdvance = () => {
    if (!survey.oneQuestionPerPage) return
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => {
      if (step < questions.length - 1) {
        setDir(1)
        setStep((s) => s + 1)
      }
    }, 420)
  }

  const style = { '--accent': accent } as CSSProperties
  const greet = survey.respondentName ? `Здравствуйте, ${survey.respondentName.split(' ')[0]}!` : null

  const primaryBtn = (label: React.ReactNode, onClick: () => void, opts?: { loading?: boolean; icon?: React.ReactNode }) => (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={opts?.loading}
      className="inline-flex h-12 items-center gap-2 rounded-full bg-graphite px-7 text-base font-semibold text-milk shadow-card transition hover:bg-[var(--accent)] disabled:opacity-60"
    >
      {opts?.loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-milk/40 border-t-milk" /> : null}
      {label}
      {!opts?.loading && opts?.icon}
    </motion.button>
  )

  return (
    <div className={cn('relative flex flex-col', embedded ? 'min-h-[520px]' : 'min-h-screen')} style={style}>
      {embedded ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-[0.08] blur-3xl" style={{ background: accent }} />
        </div>
      ) : (
        <AnimatedBackground accent={accent} />
      )}

      {/* прогресс */}
      <div className={cn('z-20 h-1 w-full bg-graphite/5', embedded ? 'absolute left-0 top-0' : 'fixed left-0 top-0')}>
        <motion.div
          className="h-full"
          style={{ background: accent }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 sm:px-8">
        <AnimatePresence mode="wait" custom={dir}>
          {/* -------------------------------------------------- welcome */}
          {stage === 'welcome' && (
            <motion.div
              key="welcome"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="my-auto"
            >
              {greet && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-lg font-semibold" style={{ color: accent }}>
                  {greet} 👋
                </motion.div>
              )}
              <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-graphite sm:text-6xl">{survey.title}</h1>
              {survey.description && <p className="mt-4 whitespace-pre-line text-lg text-stone-700">{survey.description}</p>}
              {survey.welcomeMessage && (
                <p className="mt-4 whitespace-pre-line rounded-2xl border border-graphite/10 bg-graphite/[0.04] p-4 text-stone-700">{survey.welcomeMessage}</p>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                {questions.length === 0 ? (
                  <p className="text-stone-600">В анкете пока нет вопросов</p>
                ) : (
                  primaryBtn('Начать', start, { icon: <ArrowRight className="h-5 w-5" /> })
                )}
                <span className="text-sm text-stone-500">
                  {questions.length} {questions.length === 1 ? 'вопрос' : questions.length < 5 ? 'вопроса' : 'вопросов'} · ~
                  {Math.max(1, Math.round(questions.length * 0.4))} мин
                </span>
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- contact */}
          {stage === 'contact' && (
            <motion.div
              key="contact"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="my-auto"
            >
              <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-graphite sm:text-4xl">Давайте познакомимся</h2>
              <p className="mt-2 text-stone-600">Чтобы мы могли связаться с вами по результатам</p>
              <div className="mt-8 space-y-6">
                {(
                  [
                    { k: 'fullName', label: 'Ваше имя *', type: 'text', ph: 'Иван Иванов' },
                    { k: 'email', label: 'Email', type: 'email', ph: 'name@example.com' },
                    { k: 'phone', label: 'Телефон', type: 'tel', ph: '+7 (___) ___-__-__' },
                  ] as const
                ).map((f, i) => (
                  <motion.div key={f.k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                    <label className="mb-1 block text-sm font-semibold text-stone-600">{f.label}</label>
                    <input
                      type={f.type}
                      value={contact[f.k]}
                      autoFocus={i === 0}
                      maxLength={255}
                      onChange={(e) => setContact((c) => ({ ...c, [f.k]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && submitContact()}
                      placeholder={f.ph}
                      className="w-full border-b-2 border-graphite/15 bg-transparent pb-2 text-xl text-graphite outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)]"
                    />
                    {errors[f.k] && <p className="mt-1.5 text-sm text-rose-600">{errors[f.k]}</p>}
                  </motion.div>
                ))}
              </div>
              <div className="mt-10 flex items-center gap-3">
                <button type="button" onClick={() => setStage('welcome')} className="rounded-xl p-3 text-stone-600 transition hover:bg-graphite/10 hover:text-graphite">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {primaryBtn('Продолжить', submitContact, { icon: <ArrowRight className="h-5 w-5" /> })}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- one-by-one */}
          {stage === 'questions' && survey.oneQuestionPerPage && questions[step] && (
            <motion.div
              key={'q' + step}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="my-auto"
            >
              {(() => {
                const q = questions[step]
                const err = errors['q_' + q.id]
                return (
                  <>
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: accent }}>
                      <span>{step + 1}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="text-stone-500">из {questions.length}</span>
                    </div>
                    <h2 className="text-2xl font-bold leading-snug text-graphite sm:text-3xl">
                      {q.title}
                      {q.required && <span style={{ color: accent }}> *</span>}
                    </h2>
                    {q.description && <p className="mt-2 whitespace-pre-line text-stone-600">{q.description}</p>}
                    <div className="mt-8">
                      <QuestionInput
                        question={q}
                        value={answers[q.id!] ?? emptyAnswer()}
                        onChange={(a) => setAnswer(q.id!, a)}
                        accent={accent}
                        onAutoAdvance={autoAdvance}
                        onEnter={next}
                        keyboard
                      />
                    </div>
                    <AnimatePresence>
                      {err && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }}
                          exit={{ opacity: 0 }}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-700"
                        >
                          <AlertCircle className="h-4 w-4" /> {err}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="mt-10 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={back} className="rounded-xl p-3 text-stone-600 transition hover:bg-graphite/10 hover:text-graphite">
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      {step < questions.length - 1
                        ? primaryBtn('Далее', next, { icon: <Check className="h-5 w-5" /> })
                        : primaryBtn(preview ? 'Завершить предпросмотр' : 'Отправить', next, {
                            loading: submitting,
                            icon: <Send className="h-4 w-4" />,
                          })}
                      <span className="hidden items-center gap-1 text-xs text-stone-500 sm:inline-flex">
                        или нажмите <kbd className="inline-flex items-center gap-1 rounded border border-graphite/15 px-1.5 py-0.5 font-sans">Enter <CornerDownLeft className="h-3 w-3" /></kbd>
                      </span>
                    </div>
                    {submitError && step === questions.length - 1 && <p className="mt-4 text-sm text-rose-600">{submitError}</p>}
                  </>
                )
              })()}
            </motion.div>
          )}

          {/* -------------------------------------------------- all-in-one */}
          {stage === 'questions' && !survey.oneQuestionPerPage && (
            <motion.div key="all" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="space-y-6">
              <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight text-graphite">{survey.title}</h1>
              {questions.map((q, i) => {
                const err = errors['q_' + q.id]
                return (
                  <motion.div
                    key={q.id}
                    id={`rq-${q.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    className={cn('rounded-2xl border bg-graphite/[0.03] p-6 backdrop-blur-xl transition-colors', err ? 'border-rose-500/50' : 'border-graphite/10')}
                  >
                    <div className="mb-1 text-sm font-bold" style={{ color: accent }}>
                      {i + 1}
                    </div>
                    <h2 className="text-xl font-bold text-graphite">
                      {q.title}
                      {q.required && <span style={{ color: accent }}> *</span>}
                    </h2>
                    {q.description && <p className="mt-1 text-sm text-stone-600">{q.description}</p>}
                    <div className="mt-5">
                      <QuestionInput question={q} value={answers[q.id!] ?? emptyAnswer()} onChange={(a) => setAnswer(q.id!, a)} accent={accent} />
                    </div>
                    {err && (
                      <p className="mt-3 flex items-center gap-2 text-sm text-rose-700">
                        <AlertCircle className="h-4 w-4" /> {err}
                      </p>
                    )}
                  </motion.div>
                )
              })}
              <div className="flex flex-wrap items-center gap-4 pb-10">
                {primaryBtn(preview ? 'Завершить предпросмотр' : 'Отправить ответы', submit, { loading: submitting, icon: <Send className="h-4 w-4" /> })}
                <span className="text-sm text-stone-500">
                  Отвечено {answeredCount} из {questions.length}
                </span>
                {submitError && <p className="w-full text-sm text-rose-600">{submitError}</p>}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- done */}
          {stage === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              className="relative my-auto text-center"
            >
              <Confetti accent={accent} />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
                className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-full"
                style={{ background: `${accent}30`, boxShadow: `0 0 60px -5px ${accent}` }}
              >
                <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
                </svg>
              </motion.div>
              <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-graphite sm:text-5xl">Готово!</h2>
              <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-lg text-stone-700">{thanks}</p>
              {preview && <p className="mt-6 text-sm text-stone-500">Это предпросмотр — ответы не сохранены</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!embedded && (
        <footer className="relative z-10 flex items-center justify-center gap-2 pb-6 text-xs text-stone-600">
          <span>Сделано на</span>
          <span className="scale-75">
            <Logo />
          </span>
        </footer>
      )}
      {stage === 'questions' && !survey.oneQuestionPerPage && answeredCount < questions.length && !embedded && (
        <div className="pointer-events-none fixed bottom-6 right-6 hidden animate-bounce text-stone-600 sm:block">
          <ArrowDown className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
