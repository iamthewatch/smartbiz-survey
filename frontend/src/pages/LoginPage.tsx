import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, CheckCircle2, Eye, EyeOff, Lock, Send, Sparkles, Star, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AnimatedBackground, Button, Logo } from '../components/ui'

const floating = [
  {
    className: 'left-0 top-6',
    delay: 0,
    content: (
      <>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-rust-700">Вопрос 1</div>
        <div className="mb-3 text-sm font-semibold text-graphite">Какой размер вашей компании?</div>
        {['1–10 сотрудников', '11–50 сотрудников', 'Более 50'].map((o, i) => (
          <div
            key={o}
            className={`mb-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              i === 1 ? 'border-rust-600/50 bg-rust-500/20 text-graphite' : 'border-graphite/10 text-stone-700'
            }`}
          >
            <span className={`h-3 w-3 rounded-full border ${i === 1 ? 'border-rust-700 bg-rust-600' : 'border-stone-500'}`} />
            {o}
          </div>
        ))}
      </>
    ),
  },
  {
    className: 'right-0 top-40',
    delay: 0.15,
    content: (
      <>
        <div className="mb-2 text-sm font-semibold text-graphite">Оцените сервис</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-6 w-6 ${i <= 4 ? 'fill-amber-600 text-amber-600' : 'text-stone-600'}`} />
          ))}
        </div>
      </>
    ),
  },
  {
    className: 'left-10 bottom-4',
    delay: 0.3,
    content: (
      <>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-graphite">
          <BarChart3 className="h-4 w-4 text-rust-700" /> Аналитика ответов
        </div>
        {[78, 52, 31].map((w, i) => (
          <div key={i} className="mb-2 h-2.5 overflow-hidden rounded-full bg-graphite/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${w}%` }}
              transition={{ delay: 1 + i * 0.2, duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-rust-500"
            />
          </div>
        ))}
      </>
    ),
  },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setShake((s) => s + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen">
      <AnimatedBackground />

      {/* левая часть — витрина */}
      <div className="relative hidden flex-1 flex-col justify-between p-12 lg:flex">
        <Logo />
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-rust-600/20 bg-rust-500/10 px-3 py-1 text-xs font-semibold text-rust-800"
          >
            <Sparkles className="h-3.5 w-3.5" /> Конструктор анкет для работы с лидами
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-6xl font-bold uppercase leading-[0.95] tracking-tight text-graphite"
          >
            Узнайте своих клиентов <span className="text-gradient normal-case">лучше</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-lg text-stone-600"
          >
            Собирайте анкеты в визуальном конструкторе, отправляйте персональные ссылки и смотрите аналитику по каждому
            лиду.
          </motion.p>
          <div className="mt-8 flex gap-6 text-sm text-stone-600">
            {[
              { icon: CheckCircle2, t: '12 типов вопросов' },
              { icon: Send, t: 'Ссылки для лидов' },
              { icon: BarChart3, t: 'Живая аналитика' },
            ].map(({ icon: Icon, t }, i) => (
              <motion.div
                key={t}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4 text-rust-600" /> {t}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative h-80 max-w-xl">
          {floating.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, rotate: i % 2 ? 4 : -4 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2 : -2 }}
              transition={{ delay: 0.5 + f.delay, type: 'spring', stiffness: 120, damping: 14 }}
              className={`absolute w-64 ${f.className}`}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
                className="glass-strong p-4"
              >
                {f.content}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* правая часть — форма */}
      <div className="flex flex-1 items-center justify-center p-6 lg:max-w-xl lg:border-l lg:border-graphite/5 lg:bg-milk/40 lg:backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="w-full max-w-sm"
        >
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-graphite">С возвращением 👋</h2>
          <p className="mt-2 text-sm text-stone-600">Войдите в панель администратора</p>

          <motion.form
            key={shake}
            animate={shake ? { x: [0, -12, 12, -8, 8, -4, 0] } : {}}
            transition={{ duration: 0.45 }}
            onSubmit={submit}
            className="mt-8 space-y-4"
          >
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                className="field h-12 pl-11"
                placeholder="Логин"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                className="field h-12 pl-11 pr-11"
                placeholder="Пароль"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-500 hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" className="group w-full" loading={loading} disabled={!username || !password}>
              Войти
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </Button>
          </motion.form>

          <p className="mt-10 text-center text-xs text-stone-600">
            Регистрация не требуется — доступ выдаётся администратором системы
          </p>
        </motion.div>
      </div>
    </div>
  )
}
