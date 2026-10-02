import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayCount } from '../api/types'
import { plural } from '../lib/utils'

const short = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

export default function TimelineChart({ data, height = 240 }: { data: DayCount[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: short.format(new Date(d.date)) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 10, right: 6, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111111" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#111111" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="tl-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#111111" />
            <stop offset="100%" stopColor="#111111" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(17,17,17,.07)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8a8782', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fill: '#8a8782', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: 'rgba(198,90,30,.5)', strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-xl border border-graphite/10 bg-paper px-3 py-2 text-xs shadow-card">
                <div className="text-stone-600">{payload[0].payload.label}</div>
                <div className="mt-0.5 font-bold text-graphite">
                  {payload[0].value} {plural(Number(payload[0].value), ['ответ', 'ответа', 'ответов'])}
                </div>
              </div>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="url(#tl-stroke)"
          strokeWidth={2.5}
          fill="url(#tl-fill)"
          animationDuration={1200}
          activeDot={{ r: 5, fill: '#C65A1E', stroke: '#FBFAF7', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
