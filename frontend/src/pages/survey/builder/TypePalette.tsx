import { motion } from 'framer-motion'
import type { QuestionType } from '../../../api/types'
import { GROUP_LABELS, QUESTION_TYPES } from '../../../lib/questionTypes'
import { cn } from '../../../lib/utils'

export default function TypePalette({ onAdd, compact }: { onAdd: (t: QuestionType) => void; compact?: boolean }) {
  const groups = Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]
  return (
    <div className={cn(compact ? 'grid grid-cols-2 gap-x-3 sm:grid-cols-4' : 'space-y-4')}>
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">{GROUP_LABELS[g]}</div>
          <div className="space-y-1">
            {QUESTION_TYPES.filter((t) => t.group === g).map((t, i) => (
              <motion.button
                key={t.type}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onAdd(t.type)}
                title={t.hint}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm text-stone-700 transition-colors hover:bg-graphite/[0.06] hover:text-graphite"
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-milk shadow-md transition-transform group-hover:scale-110',
                    t.color,
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate font-medium">{t.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
