import { motion } from 'framer-motion'
import { Check, Palette } from 'lucide-react'
import { Switch, Textarea } from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { ACCENT_COLORS, type Draft } from './draft'

export default function SettingsPanel({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="label flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Цвет анкеты
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <motion.button
              key={c}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange({ accentColor: c })}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-milk transition',
                draft.accentColor === c ? 'ring-graphite/80' : 'ring-transparent',
              )}
              style={{ background: c }}
            >
              {draft.accentColor === c && <Check className="h-4 w-4 text-milk" />}
            </motion.button>
          ))}
          <label
            className="relative grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-graphite/30 text-xs text-stone-600"
            title="Свой цвет"
          >
            +
            <input
              type="color"
              value={draft.accentColor}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </section>

      <section>
        <label className="label">Приветствие</label>
        <Textarea
          rows={3}
          value={draft.welcomeMessage}
          maxLength={5000}
          placeholder="Текст на стартовом экране анкеты"
          onChange={(e) => onChange({ welcomeMessage: e.target.value })}
        />
      </section>

      <section>
        <label className="label">Сообщение после отправки</label>
        <Textarea
          rows={3}
          value={draft.thankYouMessage}
          maxLength={5000}
          placeholder="Спасибо! Ваши ответы успешно отправлены."
          onChange={(e) => onChange({ thankYouMessage: e.target.value })}
        />
      </section>

      <section className="space-y-4">
        <div className="label">Поведение</div>
        <Switch
          checked={draft.oneQuestionPerPage}
          onChange={(v) => onChange({ oneQuestionPerPage: v })}
          label="По одному вопросу на экран"
          description="Пошаговый режим с прогрессом. Выключите, чтобы показать все вопросы списком."
        />
        <Switch
          checked={draft.collectContact}
          onChange={(v) => onChange({ collectContact: v })}
          label="Спрашивать имя и контакты"
          description="Респондент станет лидом в вашей базе. Иначе — анонимные ответы."
        />
      </section>
    </div>
  )
}
