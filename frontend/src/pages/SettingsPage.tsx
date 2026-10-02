import { motion } from 'framer-motion'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { authApi } from '../api/api'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Button, Field, Input, PageHeader } from '../components/ui'

export default function SettingsPage() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < 6

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (mismatch || tooShort) return
    setSaving(true)
    try {
      await authApi.changePassword(current, next)
      toast.success('Пароль изменён')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Учётная запись администратора" />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-graphite text-milk">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-graphite">{user?.fullName}</div>
              <div className="text-xs text-stone-500">
                @{user?.username} · {user?.role}
              </div>
            </div>
          </div>
          <p className="text-sm text-stone-600">
            Регистрация в системе отключена: единственный администратор создаётся миграцией базы данных. Не забудьте сменить пароль
            по умолчанию.
          </p>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onSubmit={submit} className="glass space-y-4 p-6">
          <div className="flex items-center gap-2 font-bold text-graphite">
            <KeyRound className="h-4 w-4 text-rust-700" /> Смена пароля
          </div>
          <Field label="Текущий пароль">
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="Новый пароль" error={tooShort ? 'Минимум 6 символов' : undefined}>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} invalid={tooShort} autoComplete="new-password" />
          </Field>
          <Field label="Повторите пароль" error={mismatch ? 'Пароли не совпадают' : undefined}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={mismatch} autoComplete="new-password" />
          </Field>
          <Button type="submit" loading={saving} disabled={!current || !next || mismatch || tooShort}>
            Сохранить пароль
          </Button>
        </motion.form>
      </div>
    </>
  )
}
