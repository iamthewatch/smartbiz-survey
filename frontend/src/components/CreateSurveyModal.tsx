import { motion } from 'framer-motion'
import { FilePlus2, Heart, MessageCircleHeart, Target } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { surveyApi } from '../api/api'
import { errorMessage } from '../api/client'
import { useAsync } from '../lib/useAsync'
import { cn, plural } from '../lib/utils'
import { Button, Input, Modal } from './ui'

const ICONS: Record<string, { icon: typeof Heart; gradient: string }> = {
  blank: { icon: FilePlus2, gradient: 'from-graphite to-graphite-700' },
  'lead-qualification': { icon: Target, gradient: 'from-rust-500 to-rust-600' },
  nps: { icon: Heart, gradient: 'from-graphite to-graphite-700' },
  feedback: { icon: MessageCircleHeart, gradient: 'from-graphite to-graphite-700' },
}

export default function CreateSurveyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: templates } = useAsync(() => (open ? surveyApi.templates() : Promise.resolve(null)), [open])
  const [selected, setSelected] = useState('blank')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    setLoading(true)
    try {
      const s = await surveyApi.create(selected, title.trim() || undefined)
      toast.success('Анкета создана')
      onClose()
      navigate(`/surveys/${s.id}/edit`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Новая анкета"
      description="Начните с шаблона — все вопросы можно изменить в конструкторе"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={create} loading={loading}>
            Создать и открыть конструктор
          </Button>
        </>
      }
    >
      <label className="label">Название (необязательно)</label>
      <Input
        placeholder="Например: Анкета для новых клиентов"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
        autoFocus
      />
      <div className="label mt-6">Шаблон</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(templates ?? []).map((t, i) => {
          const meta = ICONS[t.key] ?? ICONS.blank
          const Icon = meta.icon
          const active = selected === t.key
          return (
            <motion.button
              key={t.key}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(t.key)}
              className={cn(
                'relative rounded-2xl border p-4 text-left transition-colors',
                active ? 'border-rust-600/60 bg-rust-500/10 shadow-glow' : 'border-graphite/10 bg-graphite/[0.02] hover:border-graphite/20',
              )}
            >
              <div className={cn('mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-milk', meta.gradient)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-bold text-graphite">{t.key === 'blank' ? 'С чистого листа' : t.title}</div>
              <div className="mt-1 text-xs text-stone-600">
                {t.key === 'blank'
                  ? 'Пустая анкета без вопросов'
                  : `${t.questionCount} ${plural(t.questionCount, ['вопрос', 'вопроса', 'вопросов'])} · ${t.description ?? ''}`}
              </div>
            </motion.button>
          )
        })}
      </div>
    </Modal>
  )
}
