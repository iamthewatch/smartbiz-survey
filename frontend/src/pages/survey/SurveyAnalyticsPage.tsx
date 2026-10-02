import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, ChevronLeft, ChevronRight, Clock, Download, Eye, Inbox, ListChecks, MessageSquareText, Send, Target, User } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { analyticsApi, surveyApi } from '../../api/api'
import { errorMessage } from '../../api/client'
import type { LeadBrief } from '../../api/types'
import LeadPicker from '../../components/LeadPicker'
import ResponseDrawer from '../../components/ResponseDrawer'
import TimelineChart from '../../components/TimelineChart'
import { Button, EmptyState, StatCard, Tabs } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { downloadBlob, formatDateTime, formatDuration } from '../../lib/utils'
import QuestionStatCard from './analytics/QuestionStatCard'
import { useSurveyContext } from './SurveyLayout'

export default function SurveyAnalyticsPage() {
  const { survey } = useSurveyContext()
  const [params, setParams] = useSearchParams()
  const leadId = params.get('leadId') ? Number(params.get('leadId')) : undefined
  const [lead, setLead] = useState<LeadBrief | null>(null)
  const [tab, setTab] = useState<'summary' | 'responses'>('summary')
  const [page, setPage] = useState(0)
  const [openResponse, setOpenResponse] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const { data, loading, reload } = useAsync(() => analyticsApi.survey(survey.id, leadId), [survey.id, leadId])
  const responses = useAsync(() => analyticsApi.responses(survey.id, leadId, page, 15), [survey.id, leadId, page])

  const selectedLead = lead ?? data?.lead ?? null

  const changeLead = (l: LeadBrief | null) => {
    setLead(l)
    setPage(0)
    const next = new URLSearchParams(params)
    if (l) next.set('leadId', String(l.id))
    else next.delete('leadId')
    setParams(next, { replace: true })
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const blob = await surveyApi.exportCsv(survey.id)
      downloadBlob(blob, `${survey.title.replace(/[^\p{L}\p{N}]+/gu, '_')}_ответы.csv`)
      toast.success('Файл выгружен')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const onDeleted = () => {
    reload(true)
    responses.reload(true)
  }

  const t = data?.totals

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          layoutId="analytics-tab"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'summary', label: <><BarChart3 className="h-4 w-4" /> Сводка</> },
            { value: 'responses', label: <><ListChecks className="h-4 w-4" /> Ответы {t ? `(${t.responses})` : ''}</> },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <LeadPicker value={selectedLead} onChange={changeLead} />
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={exportCsv}>
            Экспорт CSV
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-rust-600/20 bg-rust-600/15 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-rust-500 text-lg font-bold text-milk">
                {selectedLead.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wider text-rust-700">Аналитика по лиду</div>
                <div className="truncate text-lg font-bold text-graphite">{selectedLead.fullName}</div>
                <div className="text-xs text-stone-600">{[selectedLead.email, selectedLead.phone, selectedLead.company].filter(Boolean).join(' · ')}</div>
              </div>
              {responses.data && responses.data.items[0] && (
                <Button variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setOpenResponse(responses.data!.items[0].id)}>
                  Открыть ответы лида
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-36" />
          ))}
          <div className="skeleton h-72 sm:col-span-2 xl:col-span-4" />
        </div>
      ) : !data || !t ? null : tab === 'summary' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<MessageSquareText className="h-5 w-5" />} label="Ответов" value={t.responses} delay={0} />
            {leadId ? (
              <StatCard
                icon={<User className="h-5 w-5" />}
                label="Вопросов с ответом"
                value={data.questions.filter((q) => q.answered > 0).length}
                hint={`из ${data.questions.length}`}
                delay={0.05}
              />
            ) : (
              <StatCard
                icon={<Send className="h-5 w-5" />}
                label="Приглашено лидов"
                value={t.invitations}
                hint={`${t.opened} открыли ссылку`}
                delay={0.05}
              />
            )}
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Конверсия приглашений"
              value={leadId ? (t.responses > 0 ? 100 : 0) : t.completionRate}
              decimals={leadId ? 0 : 1}
              suffix="%"
              hint={leadId ? undefined : `${t.completed} из ${t.invitations} прошли`}
              delay={0.1}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Среднее время"
              value={Math.round((t.avgDurationSeconds ?? 0) / 60 * 10) / 10}
              decimals={1}
              suffix=" мин"
              hint={formatDuration(t.avgDurationSeconds)}
              delay={0.15}
            />
          </div>

          {!leadId && data.timeline.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6">
              <h3 className="font-bold text-graphite">Динамика ответов</h3>
              <p className="mb-4 text-xs text-stone-500">За последние 30 дней</p>
              <TimelineChart data={data.timeline} height={220} />
            </motion.div>
          )}

          {t.responses === 0 ? (
            <EmptyState
              icon={<Inbox className="h-7 w-7" />}
              title={leadId ? 'Этот лид ещё не отвечал' : 'Ответов пока нет'}
              description={
                leadId
                  ? 'Отправьте ему персональную ссылку на вкладке «Рассылка».'
                  : 'Как только лиды начнут проходить анкету, здесь появятся графики по каждому вопросу.'
              }
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.questions.map((q, i) => (
                <QuestionStatCard key={q.questionId} stat={q} index={i} onOpenResponse={setOpenResponse} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {responses.data && responses.data.items.length === 0 ? (
            <EmptyState icon={<Inbox className="h-7 w-7" />} title="Ответов пока нет" />
          ) : (
            <div className="glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-graphite/5 text-left text-xs uppercase tracking-wider text-stone-500">
                      <th className="px-5 py-3 font-semibold">Респондент</th>
                      <th className="px-5 py-3 font-semibold">Дата</th>
                      <th className="px-5 py-3 font-semibold">Время</th>
                      <th className="px-5 py-3 font-semibold">Заполнено</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {(responses.data?.items ?? []).map((r, i) => {
                      const total = data.questions.length || 1
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setOpenResponse(r.id)}
                          className="cursor-pointer border-b border-graphite/[0.03] transition hover:bg-graphite/[0.04]"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft text-xs font-bold text-graphite">
                                {(r.lead?.fullName ?? 'А').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-stone-900">{r.lead?.fullName ?? 'Аноним'}</div>
                                <div className="truncate text-xs text-stone-500">{r.lead?.email ?? r.lead?.phone ?? ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-stone-700">{formatDateTime(r.submittedAt)}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-stone-600">{formatDuration(r.durationSeconds)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-graphite/5">
                                <div className="h-full rounded-full bg-graphite" style={{ width: `${(r.answeredCount / total) * 100}%` }} />
                              </div>
                              <span className="text-xs text-stone-600">
                                {r.answeredCount}/{total}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Eye className="ml-auto h-4 w-4 text-stone-500" />
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {responses.data && responses.data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-graphite/5 px-5 py-3 text-sm text-stone-600">
                  <span>
                    Стр. {responses.data.page + 1} из {responses.data.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={page + 1 >= responses.data.totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      <ResponseDrawer responseId={openResponse} onClose={() => setOpenResponse(null)} onDeleted={onDeleted} />
    </div>
  )
}
