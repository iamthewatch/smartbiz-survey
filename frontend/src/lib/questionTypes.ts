import {
  AlignLeft,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  CircleDot,
  Gauge,
  Hash,
  Phone,
  Star,
  ThumbsUp,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { QuestionDto, QuestionType } from '../api/types'

export interface QuestionTypeMeta {
  type: QuestionType
  label: string
  hint: string
  icon: LucideIcon
  /** tailwind-градиент для иконки */
  color: string
  group: 'choice' | 'text' | 'scale' | 'other'
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  { type: 'SINGLE_CHOICE', label: 'Один вариант', hint: 'Выбор одного ответа', icon: CircleDot, color: 'from-graphite to-graphite-700', group: 'choice' },
  { type: 'MULTIPLE_CHOICE', label: 'Несколько вариантов', hint: 'Можно отметить несколько', icon: CheckSquare, color: 'from-graphite to-graphite-700', group: 'choice' },
  { type: 'DROPDOWN', label: 'Выпадающий список', hint: 'Компактный выбор из списка', icon: ChevronDownSquare, color: 'from-graphite to-graphite-700', group: 'choice' },
  { type: 'SHORT_TEXT', label: 'Короткий ответ', hint: 'Одна строка текста', icon: Type, color: 'from-graphite to-graphite-700', group: 'text' },
  { type: 'LONG_TEXT', label: 'Развёрнутый ответ', hint: 'Свободный текст', icon: AlignLeft, color: 'from-graphite to-graphite-700', group: 'text' },
  { type: 'RATING', label: 'Оценка звёздами', hint: 'От 1 до 5 (или 10) звёзд', icon: Star, color: 'from-graphite to-graphite-700', group: 'scale' },
  { type: 'SCALE', label: 'Шкала / NPS', hint: 'Например, от 0 до 10', icon: Gauge, color: 'from-graphite to-graphite-700', group: 'scale' },
  { type: 'YES_NO', label: 'Да / Нет', hint: 'Быстрый бинарный ответ', icon: ThumbsUp, color: 'from-graphite to-graphite-700', group: 'scale' },
  { type: 'NUMBER', label: 'Число', hint: 'Количество, сумма, возраст', icon: Hash, color: 'from-graphite to-graphite-700', group: 'other' },
  { type: 'DATE', label: 'Дата', hint: 'Выбор даты', icon: Calendar, color: 'from-graphite to-graphite-700', group: 'other' },
  { type: 'EMAIL', label: 'Email', hint: 'С проверкой формата', icon: AtSign, color: 'from-graphite to-graphite-700', group: 'other' },
  { type: 'PHONE', label: 'Телефон', hint: 'Номер для связи', icon: Phone, color: 'from-graphite to-graphite-700', group: 'other' },
]

export const TYPE_META: Record<QuestionType, QuestionTypeMeta> = Object.fromEntries(
  QUESTION_TYPES.map((m) => [m.type, m]),
) as Record<QuestionType, QuestionTypeMeta>

export const GROUP_LABELS: Record<QuestionTypeMeta['group'], string> = {
  choice: 'Выбор',
  text: 'Текст',
  scale: 'Оценки',
  other: 'Данные',
}

export const isChoice = (t: QuestionType) => t === 'SINGLE_CHOICE' || t === 'MULTIPLE_CHOICE' || t === 'DROPDOWN'
export const isNumeric = (t: QuestionType) => t === 'RATING' || t === 'SCALE' || t === 'NUMBER' || t === 'YES_NO'

/** Значения по умолчанию для нового вопроса данного типа. */
export function defaultsFor(type: QuestionType): Partial<QuestionDto> {
  switch (type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'DROPDOWN':
      return { options: [{ id: null, label: 'Вариант 1' }, { id: null, label: 'Вариант 2' }] }
    case 'RATING':
      return { minValue: 1, maxValue: 5 }
    case 'SCALE':
      return { minValue: 0, maxValue: 10, minLabel: 'Маловероятно', maxLabel: 'Очень вероятно' }
    default:
      return {}
  }
}
