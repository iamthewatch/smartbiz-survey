import type { PublicSurvey, QuestionDto, QuestionType, SurveyDetail, UpdateSurveyRequest } from '../../../api/types'
import { defaultsFor, isChoice } from '../../../lib/questionTypes'
import { uid } from '../../../lib/utils'

/** В черновике у каждого вопроса/варианта есть стабильный клиентский key — для drag&drop и анимаций. */
export interface DraftOption {
  key: string
  id: number | null
  label: string
}

export interface DraftQuestion extends Omit<QuestionDto, 'options'> {
  key: string
  options: DraftOption[]
}

export interface Draft {
  title: string
  description: string
  accentColor: string
  welcomeMessage: string
  thankYouMessage: string
  publicLinkEnabled: boolean
  collectContact: boolean
  oneQuestionPerPage: boolean
  questions: DraftQuestion[]
}

// по дизайн-коду: rust — фирменный акцент, остальные — сдержанные тона без кислотности
export const ACCENT_COLORS = ['#C65A1E', '#111111', '#5A6470', '#8A6A4F', '#2F5D50', '#7A2E2E', '#3D4A6B']

export function toDraft(s: SurveyDetail): Draft {
  return {
    title: s.title ?? '',
    description: s.description ?? '',
    accentColor: s.accentColor ?? ACCENT_COLORS[0],
    welcomeMessage: s.welcomeMessage ?? '',
    thankYouMessage: s.thankYouMessage ?? '',
    publicLinkEnabled: s.publicLinkEnabled,
    collectContact: s.collectContact,
    oneQuestionPerPage: s.oneQuestionPerPage,
    questions: s.questions.map((q) => ({
      ...q,
      key: uid(),
      options: q.options.map((o) => ({ key: uid(), id: o.id, label: o.label })),
    })),
  }
}

export function toRequest(d: Draft, version?: number): UpdateSurveyRequest {
  return {
    title: d.title.trim() || 'Без названия',
    description: d.description,
    accentColor: d.accentColor,
    welcomeMessage: d.welcomeMessage,
    thankYouMessage: d.thankYouMessage,
    publicLinkEnabled: d.publicLinkEnabled,
    collectContact: d.collectContact,
    oneQuestionPerPage: d.oneQuestionPerPage,
    version,
    questions: d.questions.map((q) => ({
      id: q.id,
      type: q.type,
      title: q.title,
      description: q.description,
      required: q.required,
      allowOther: q.allowOther,
      placeholder: q.placeholder,
      minValue: q.minValue,
      maxValue: q.maxValue,
      minLabel: q.minLabel,
      maxLabel: q.maxLabel,
      minSelections: q.minSelections,
      maxSelections: q.maxSelections,
      options: isChoice(q.type) ? q.options.map((o) => ({ id: o.id, label: o.label })) : [],
    })),
  }
}

/**
 * После сохранения сервер присваивает id новым вопросам и вариантам.
 * Сопоставляем их по позиции в отправленном снимке и переносим в актуальный черновик по key,
 * чтобы не затереть правки, сделанные пока шёл запрос.
 */
export function applyServerIds(current: Draft, sent: Draft, saved: SurveyDetail): Draft {
  const qIds = new Map<string, number | null>()
  const oIds = new Map<string, number | null>()
  sent.questions.forEach((q, i) => {
    const sq = saved.questions[i]
    if (!sq) return
    qIds.set(q.key, sq.id)
    q.options.forEach((o, j) => {
      const so = sq.options[j]
      if (so) oIds.set(o.key, so.id)
    })
  })
  let changed = false
  const questions = current.questions.map((q) => {
    const id = q.id ?? qIds.get(q.key) ?? null
    let optsChanged = false
    const options = q.options.map((o) => {
      const oid = o.id ?? oIds.get(o.key) ?? null
      if (oid !== o.id) {
        optsChanged = true
        return { ...o, id: oid }
      }
      return o
    })
    if (id !== q.id || optsChanged) {
      changed = true
      return { ...q, id, options }
    }
    return q
  })
  return changed ? { ...current, questions } : current
}

export function newQuestion(type: QuestionType): DraftQuestion {
  const d = defaultsFor(type)
  return {
    key: uid(),
    id: null,
    type,
    title: '',
    description: null,
    required: false,
    allowOther: false,
    placeholder: null,
    minValue: d.minValue ?? null,
    maxValue: d.maxValue ?? null,
    minLabel: d.minLabel ?? null,
    maxLabel: d.maxLabel ?? null,
    minSelections: null,
    maxSelections: null,
    options: (d.options ?? []).map((o) => ({ key: uid(), id: null, label: o.label })),
  }
}

/** Смена типа вопроса с сохранением всего, что можно сохранить. */
export function changeType(q: DraftQuestion, type: QuestionType): DraftQuestion {
  const d = defaultsFor(type)
  const keepOptions = isChoice(type) && q.options.length > 0
  return {
    ...q,
    type,
    allowOther: isChoice(type) ? q.allowOther : false,
    minValue: d.minValue ?? null,
    maxValue: d.maxValue ?? null,
    minLabel: d.minLabel ?? null,
    maxLabel: d.maxLabel ?? null,
    minSelections: null,
    maxSelections: null,
    options: keepOptions ? q.options : (d.options ?? []).map((o) => ({ key: uid(), id: null, label: o.label })),
  }
}

export function duplicateQuestion(q: DraftQuestion): DraftQuestion {
  return {
    ...q,
    key: uid(),
    id: null,
    title: q.title ? `${q.title} (копия)` : '',
    options: q.options.map((o) => ({ ...o, key: uid(), id: null })),
  }
}

/** Превращает черновик в формат публичной анкеты — для предпросмотра. */
export function toPreview(d: Draft): PublicSurvey {
  let fake = -1
  return {
    title: d.title || 'Без названия',
    description: d.description,
    accentColor: d.accentColor,
    welcomeMessage: d.welcomeMessage,
    thankYouMessage: d.thankYouMessage || 'Спасибо! Ваши ответы успешно отправлены.',
    collectContact: false,
    oneQuestionPerPage: d.oneQuestionPerPage,
    respondentName: undefined,
    questions: d.questions.map((q) => ({
      ...q,
      id: q.id ?? fake--,
      title: q.title || 'Без названия',
      options: q.options.map((o) => ({ id: o.id ?? fake--, label: o.label || 'Вариант' })),
    })),
  }
}
