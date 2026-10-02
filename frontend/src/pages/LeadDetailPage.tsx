import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Building2, CheckCircle2, Clock, Eye, Mail, Pencil, Phone, Send, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { leadApi } from '../api/api'
import ResponseDrawer from '../components/ResponseDrawer'
import { Button, EmptyState, PageLoader } from '../components/ui'
import { useAsync } from '../lib/useAsync'
import { cn, formatDate, formatDateTime, formatDuration } from '../lib/utils'
import { LeadFormModal } from './LeadsPage'

const INV_STATUS = {
  SENT: { label: 'Отправлено', cls: 'text-stone-700 bg-stone-500/15', icon: Send },
  OPENED: { label: 'Открыто', cls: 'text-stone-700 bg-stone-500/15', icon: Eye },
  COMPLETED: { label: 'Пройдено', cls: 'text-emerald-700 bg-emerald-500/15', icon: CheckCircle2 },
}

export default function LeadDetailPage() {
  const { id } = useParams()
  const leadId = Number(id)
  const { data, loading, error, reload } = useAsync(() => leadApi.get(leadId), [leadId])
  const [editOpen, setEditOpen] = useState(false)
  const [openResponse, setOpenResponse] = useState<number | null>(null)

  if (loading && !data) return <PageLoader />
  if (error || !data) return <EmptyState icon={<Mail className="h-7 w-7" />} title="Лид не найден" description={error?.message} />

  const { lead, invitations, responses } = data

  return (
    <>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-600 transition hover:text-graphite">
        <ArrowLeft className="h-4 w-4" /> Все лиды
      </Link>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass relative h-fit overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rust-600/30 blur-3xl" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-rust-500 text-3xl font-extrabold text-milk shadow-glow"
            >
              {lead.fullName.charAt(0).toUpperCase()}
            </motion.div>
            <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-graphite">{lead.fullName}</h1>
            <p className="mt-1 text-xs text-stone-500">Добавлен {formatDate(lead.createdAt)}</p>

            <div className="mt-6 space-y-3 text-sm">
              {[
                { icon: Mail, v: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
                { icon: Phone, v: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
                { icon: Building2, v: lead.company },
              ].map(({ icon: Icon, v, href }, i) =>
                v ? (
                  <div key={i} className="flex items-center gap-3 text-stone-700">
                    <Icon className="h-4 w-4 text-stone-500" />
                    {href ? (
                      <a href={href} className="hover:text-rust-800">
                        {v}
                      </a>
                    ) : (
                      v
                    )}
                  </div>
                ) : null,
              )}
              {lead.note && (
                <div className="flex gap-3 rounded-xl bg-graphite/[0.03] p-3 text-stone-700">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
                  <p className="whitespace-pre-wrap">{lead.note}</p>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-graphite/[0.04] p-3 text-center">
                <div className="text-2xl font-extrabold text-graphite">{invitations.length}</div>
                <div className="text-xs text-stone-500">приглашений</div>
              </div>
              <div className="rounded-xl bg-graphite/[0.04] p-3 text-center">
                <div className="text-2xl font-extrabold text-emerald-700">{responses.length}</div>
                <div className="text-xs text-stone-500">ответов</div>
              </div>
            </div>

            <Button variant="secondary" className="mt-6 w-full" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Редактировать
            </Button>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="mb-3 text-lg font-bold text-graphite">Ответы на анкеты</h2>
            {responses.length === 0 ? (
              <div className="glass p-8 text-center text-sm text-stone-500">Лид ещё не проходил анкеты</div>
            ) : (
              <div className="space-y-2">
                {responses.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    className="glass flex flex-wrap items-center gap-4 p-4"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-graphite">{r.surveyTitle}</div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span>{formatDateTime(r.submittedAt)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(r.durationSeconds)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setOpenResponse(r.id)}>
                        Ответы
                      </Button>
                      <Link to={`/surveys/${r.surveyId}/analytics?leadId=${lead.id}`}>
                        <Button size="sm" variant="ghost" icon={<BarChart3 className="h-3.5 w-3.5" />}>
                          Аналитика
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="mb-3 text-lg font-bold text-graphite">Приглашения</h2>
            {invitations.length === 0 ? (
              <div className="glass p-8 text-center text-sm text-stone-500">
                Лиду ещё не отправляли анкеты. Пригласите его на вкладке «Рассылка» нужной анкеты.
              </div>
            ) : (
              <div className="glass divide-y divide-graphite/5">
                {invitations.map((inv) => {
                  const st = INV_STATUS[inv.status]
                  return (
                    <div key={inv.id} className="flex flex-wrap items-center gap-3 p-4">
                      <Link to={`/surveys/${inv.surveyId}/analytics`} className="min-w-0 flex-1 truncate font-semibold text-stone-800 hover:text-graphite">
                        {inv.surveyTitle}
                      </Link>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', st.cls)}>
                        <st.icon className="h-3 w-3" /> {st.label}
                      </span>
                      <span className="text-xs text-stone-500">{formatDateTime(inv.completedAt ?? inv.openedAt ?? inv.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.section>
        </div>
      </div>

      <LeadFormModal open={editOpen} lead={lead} onClose={() => setEditOpen(false)} onSaved={() => reload(true)} />
      <ResponseDrawer responseId={openResponse} onClose={() => setOpenResponse(null)} onDeleted={() => reload(true)} />
    </>
  )
}
