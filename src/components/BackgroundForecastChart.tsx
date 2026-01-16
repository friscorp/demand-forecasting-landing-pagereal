"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface BackgroundForecastChartProps {
  data: Array<{ ds: string; yhat: number }>
}

export function BackgroundForecastChart({ data }: BackgroundForecastChartProps) {
  const chartData =
    data.length > 0
      ? data.map((point) => ({
          date: new Date(point.ds).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: Math.round(point.yhat),
        }))
      : [
          { date: "Day 1", value: 0 },
          { date: "Day 2", value: 0 },
          { date: "Day 3", value: 0 },
          { date: "Day 4", value: 0 },
          { date: "Day 5", value: 0 },
          { date: "Day 6", value: 0 },
          { date: "Day 7", value: 0 },
        ]

  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(156, 49%, 47%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(156, 49%, 47%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={data.length > 0 ? ["auto", "auto"] : [0, 1]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(156, 49%, 47%)"
            strokeWidth={2}
            fill="url(#mintGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
