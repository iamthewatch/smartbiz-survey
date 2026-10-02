import { motion, useInView } from 'framer-motion'
import { MessageSquareQuote, Star } from 'lucide-react'
import { useRef, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { QuestionStat, TextAnswer } from '../../../api/types'
import { TYPE_META, isChoice } from '../../../lib/questionTypes'
import { cn, timeAgo } from '../../../lib/utils'


function Bar({ label, count, percent, index, highlight }: { label: string; count: number; percent: number; index: number; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className={cn('min-w-0 truncate', highlight ? 'font-semibold text-graphite' : 'text-stone-700')}>{label}</span>
        <span className="shrink-0 text-stone-600">
          <b className="text-graphite">{count}</b> · {percent.toLocaleString('ru-RU')}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-graphite/5">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(percent, count > 0 ? 2 : 0)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full rounded-full', highlight ? 'bg-rust-500' : 'bg-graphite')}
        />
      </div>
    </div>
  )
}

function TextAnswers({ items, total, onOpen }: { items: TextAnswer[]; total: number; onOpen: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, 4)
  if (items.length === 0) return <p className="text-sm text-stone-500">Пока нет ответов</p>
  return (
    <div className="space-y-2">
      {shown.map((t, i) => (
        <motion.button
          key={t.responseId + '-' + i}
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onOpen(t.responseId)}
          className="block w-full rounded-xl border border-graphite/5 bg-graphite/[0.03] p-3 text-left transition hover:border-graphite/15 hover:bg-graphite/[0.05]"
        >
          <p className="whitespace-pre-wrap text-sm text-stone-800">«{t.text}»</p>
          <p className="mt-1.5 text-xs text-stone-500">
            {t.leadName ?? 'Аноним'} · {timeAgo(t.submittedAt)}
          </p>
        </motion.button>
      ))}
      {items.length > 4 && (
        <button onClick={() => setExpanded((v) => !v)} className="text-sm font-semibold text-rust-700 hover:text-rust-800">
          {expanded ? 'Свернуть' : `Показать все (${total})`}
        </button>
      )}
    </div>
  )
}

function NpsGauge({ nps }: { nps: number }) {
  // -100..100 -> 0..1
  const t = (nps + 100) / 200
  const angle = -90 + t * 180
  const color = nps < 0 ? '#f43f5e' : nps < 30 ? '#f59e0b' : nps < 70 ? '#22c55e' : '#10b981'
  const ref = useRef<HTMLDivElement>(null)
  const shown = useInView(ref, { once: true })
  return (
    <div ref={ref} className="relative mx-auto w-48">
      <svg viewBox="0 0 200 110" className="w-full">
        <defs>
          <linearGradient id="nps-g" x1="0" x2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="rgba(17,17,17,.07)" strokeWidth="16" strokeLinecap="round" />
        <motion.path
          d="M 15 100 A 85 85 0 0 1 185 100"
          fill="none"
          stroke="url(#nps-g)"
          strokeWidth="16"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: t }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
        <g
          style={{
            transform: `rotate(${shown ? angle : -90}deg)`,
            transformOrigin: '100px 100px',
            transition: 'transform 1.4s cubic-bezier(.34,1.56,.64,1) .2s',
          }}
        >
          <line x1="100" y1="100" x2="100" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="white" />
      </svg>
      <div className="-mt-1 text-center">
        <div className="text-3xl font-extrabold" style={{ color }}>
          {nps > 0 ? '+' : ''}
          {nps}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">NPS</div>
      </div>
    </div>
  )
}

export default function QuestionStatCard({ stat, index, onOpenResponse }: { stat: QuestionStat; index: number; onOpenResponse: (id: number) => void }) {
  const meta = TYPE_META[stat.type]
  const total = stat.answered + stat.skipped
  const n = stat.numeric

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="glass p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-milk shadow-lg', meta.color)}>
            <meta.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-graphite">
              <span className="text-stone-500">{index + 1}.</span> {stat.title}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              {meta.label} · ответили {stat.answered} из {total}
              {stat.skipped > 0 && `, пропустили ${stat.skipped}`}
            </p>
          </div>
        </div>
      </div>

      {stat.answered === 0 && !isChoice(stat.type) && !n?.distribution.some((d) => d.count > 0) ? (
        <p className="text-sm text-stone-500">Пока нет ответов на этот вопрос</p>
      ) : isChoice(stat.type) ? (
        <div className="space-y-3.5">
          {(() => {
            const max = Math.max(...(stat.options ?? []).map((o) => o.count), 0)
            return (stat.options ?? []).map((o, i) => (
              <Bar key={o.optionId} label={o.label} count={o.count} percent={o.percent} index={i} highlight={o.count === max && max > 0} />
            ))
          })()}
          {stat.otherCount > 0 && (
            <>
              <Bar
                label="Другое (свой вариант)"
                count={stat.otherCount}
                percent={stat.answered ? Math.round((stat.otherCount / stat.answered) * 1000) / 10 : 0}
                index={(stat.options ?? []).length}
              />
              <div className="mt-4 border-t border-graphite/5 pt-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> Свои варианты
                </div>
                <TextAnswers items={stat.otherAnswers ?? []} total={stat.otherCount} onOpen={onOpenResponse} />
              </div>
            </>
          )}
        </div>
      ) : stat.type === 'YES_NO' && n ? (
        (() => {
          const yes = n.distribution.find((d) => Number(d.value) === 1)?.count ?? 0
          const no = n.distribution.find((d) => Number(d.value) === 0)?.count ?? 0
          const sum = yes + no || 1
          const data = [
            { name: 'Да', value: yes, color: '#10b981' },
            { name: 'Нет', value: no, color: '#f43f5e' },
          ]
          return (
            <div className="flex flex-wrap items-center gap-8">
              <div className="h-40 w-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={yes && no ? 4 : 0} stroke="none" animationDuration={1000}>
                      {data.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="w-10 text-sm text-stone-700">{d.name}</span>
                    <span className="text-2xl font-extrabold text-graphite">{Math.round((d.value / sum) * 100)}%</span>
                    <span className="text-sm text-stone-500">({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()
      ) : n ? (
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex flex-col items-center gap-2 md:min-w-[200px]">
            {stat.type === 'SCALE' && n.nps != null ? (
              <NpsGauge nps={n.nps} />
            ) : (
              <>
                <div className="text-5xl font-extrabold text-graphite">{n.average?.toLocaleString('ru-RU') ?? '—'}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">среднее</div>
                {stat.type === 'RATING' && n.average != null && (
                  <div className="flex gap-0.5">
                    {n.distribution.map((d) => (
                      <Star
                        key={String(d.value)}
                        className={cn('h-5 w-5', Number(d.value) <= Math.round(n.average!) ? 'fill-amber-600 text-amber-600' : 'text-stone-700')}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="mt-1 flex gap-4 text-xs text-stone-600">
              {stat.type === 'SCALE' && n.nps != null && <span>среднее {n.average}</span>}
              <span>медиана {n.median ?? '—'}</span>
              {stat.type === 'NUMBER' && (
                <span>
                  {n.min} – {n.max}
                </span>
              )}
            </div>
          </div>
          {stat.type !== 'NUMBER' || n.distribution.length <= 20 ? (
            <div className="flex h-40 items-end gap-1.5">
              {(() => {
                const max = Math.max(...n.distribution.map((d) => d.count), 1)
                return n.distribution.map((d, i) => {
                  const v = Number(d.value)
                  const color =
                    stat.type === 'SCALE' && n.nps != null
                      ? v <= 6
                        ? 'from-rose-500 to-rose-600'
                        : v <= 8
                          ? 'from-amber-500 to-amber-600'
                          : 'from-emerald-500 to-emerald-600'
                      : 'from-graphite to-graphite-700'
                  return (
                    <div key={String(d.value)} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[11px] font-bold text-stone-600 opacity-0 transition group-hover:opacity-100">{d.count}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${(d.count / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full min-h-[3px] rounded-t-md bg-gradient-to-t ${color}`}
                      />
                      <span className="text-[11px] text-stone-500">{String(d.value)}</span>
                    </div>
                  )
                })
              })()}
            </div>
          ) : null}
        </div>
      ) : (
        <TextAnswers items={stat.textAnswers ?? []} total={stat.answered} onOpen={onOpenResponse} />
      )}
    </motion.div>
  )
}
