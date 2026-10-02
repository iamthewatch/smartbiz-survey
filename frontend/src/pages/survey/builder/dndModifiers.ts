import type { Modifier } from '@dnd-kit/core'

/** Перетаскивание карточек только по вертикали. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
