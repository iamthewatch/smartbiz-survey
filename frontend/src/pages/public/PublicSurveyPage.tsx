import { motion } from 'framer-motion'
import { CheckCircle2, Lock, SearchX } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicApi } from '../../api/api'
import type { SubmitRequest } from '../../api/types'
import SurveyRunner from '../../components/SurveyRunner'
import { AnimatedBackground, Logo, PageLoader } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'

function StatusScreen({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AnimatedBackground />
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className={`mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br text-milk shadow-glow ${tone}`}
      >
        {icon}
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-extrabold text-graphite">
        {title}
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3 max-w-md text-stone-600">
        {text}
      </motion.p>
      <div className="absolute bottom-8 opacity-60">
        <Logo />
      </div>
    </div>
  )
}

export default function PublicSurveyPage({ mode }: { mode: 'invitation' | 'public' }) {
  const { token, slug } = useParams()
  const key = (mode === 'invitation' ? token : slug) ?? ''
  const { data, loading, error } = useAsync(
    () => (mode === 'invitation' ? publicApi.invitation(key) : publicApi.survey(key)),
    [mode, key],
  )

  useEffect(() => {
    if (data) document.title = data.title
  }, [data])

  if (loading) return <PageLoader />

  if (error || !data) {
    if (error?.code === 'ALREADY_COMPLETED') {
      return (
        <StatusScreen
          icon={<CheckCircle2 className="h-10 w-10" />}
          tone="from-graphite to-graphite-700"
          title="Анкета уже пройдена"
          text="Вы уже отправили ответы по этой ссылке. Спасибо за участие!"
        />
      )
    }
    if (error?.code === 'SURVEY_CLOSED' || error?.code === 'SURVEY_NOT_PUBLISHED') {
      return <StatusScreen icon={<Lock className="h-10 w-10" />} tone="from-graphite to-graphite-700" title="Анкета недоступна" text={error.message} />
    }
    return (
      <StatusScreen
        icon={<SearchX className="h-10 w-10" />}
        tone="from-graphite to-graphite-700"
        title="Анкета не найдена"
        text={error?.status === 0 ? error.message : 'Ссылка неверна или устарела. Проверьте адрес или запросите новую ссылку.'}
      />
    )
  }

  const submit = (req: SubmitRequest) =>
    mode === 'invitation' ? publicApi.submitInvitation(key, req) : publicApi.submitSurvey(key, req)

  return <SurveyRunner survey={data} onSubmit={submit} />
}
