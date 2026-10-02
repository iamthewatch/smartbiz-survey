import { motion } from 'framer-motion'
import { ArrowUpRight, ClipboardList, MessageSquareText, Plus, Send, Target, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../api/api'
import { useAuth } from '../auth/AuthContext'
import CreateSurveyModal from '../components/CreateSurveyModal'
import TimelineChart from '../components/TimelineChart'
import { Button, EmptyState, PageHeader, StatCard, StatusBadge } from '../components/ui'
import { useAsync } from '../lib/useAsync'
import { plural, timeAgo } from '../lib/utils'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading } = useAsync(() => analyticsApi.dashboard(), [])
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <PageHeader
        title={
          <>
            {greeting()}, <span className="text-gradient">{user?.fullName ?? user?.username}</span>
          </>
        }
        subtitle="Сводка по анкетам, лидам и ответам"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Новая анкета
          </Button>
        }
      />

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40" />
          ))}
          <div className="skeleton h-80 sm:col-span-2 xl:col-span-3" />
          <div className="skeleton h-80" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Анкет"
              value={data.surveys}
              hint={`${data.publishedSurveys} активных · ${data.draftSurveys} черновиков`}
              delay={0}
            />
            <StatCard
              icon={<MessageSquareText className="h-5 w-5" />}
              label="Ответов"
              value={data.responses}
              hint={`+${data.responsesLast7Days} за 7 дней`}
              delay={0.05}
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Лидов"
              value={data.leads}
              hint={`${data.invitations} ${plural(data.invitations, ['приглашение', 'приглашения', 'приглашений'])}`}
              delay={0.1}
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Конверсия приглашений"
              value={data.completionRate}
              decimals={1}
              suffix="%"
              hint="Доля лидов, прошедших анкету"
              delay={0.15}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass p-6 xl:col-span-2"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-graphite">Активность</h3>
                  <p className="text-xs text-stone-500">Ответы за последние 30 дней</p>
                </div>
              </div>
              <TimelineChart data={data.timeline} height={260} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass p-6"
            >
              <h3 className="mb-4 font-bold text-graphite">Свежие ответы</h3>
              {data.recentResponses.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-500">Пока никто не ответил</p>
              ) : (
                <ul className="space-y-1">
                  {data.recentResponses.map((r, i) => (
                    <motion.li
                      key={r.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                    >
                      <Link
                        to={`/surveys/${r.surveyId}/analytics`}
                        className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-graphite/[0.04]"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft text-sm font-bold text-graphite">
                          {(r.leadName ?? 'А').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-stone-800">{r.leadName ?? 'Анонимный респондент'}</div>
                          <div className="truncate text-xs text-stone-500">{r.surveyTitle}</div>
                        </div>
                        <div className="shrink-0 text-xs text-stone-500">{timeAgo(r.submittedAt)}</div>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            {data.topSurveys.length === 0 ? (
              data.surveys === 0 ? (
                <EmptyState
                  icon={<Send className="h-7 w-7" />}
                  title="Создайте первую анкету"
                  description="Выберите готовый шаблон или начните с чистого листа — конструктор поможет собрать анкету за пару минут."
                  action={
                    <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                      Создать анкету
                    </Button>
                  }
                />
              ) : null
            ) : (
              <div className="glass p-6">
                <h3 className="mb-4 font-bold text-graphite">Самые популярные анкеты</h3>
                <div className="space-y-3">
                  {data.topSurveys.map((s) => {
                    const max = data.topSurveys[0].responses || 1
                    return (
                      <Link key={s.id} to={`/surveys/${s.id}/analytics`} className="group block">
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-semibold text-stone-800 group-hover:text-graphite">{s.title}</span>
                            <StatusBadge status={s.status} />
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-stone-600">
                            {s.responses} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-graphite/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.responses / max) * 100}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                            className="h-full rounded-full bg-graphite"
                          />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      <CreateSurveyModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
