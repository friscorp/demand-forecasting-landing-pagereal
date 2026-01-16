"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { ItemMetrics } from "@/lib/compute-item-metrics"

type SevenDayTotalsBarChartProps = {
  itemMetrics: ItemMetrics[]
  selectedItem: string | null
  onItemSelect: (itemName: string) => void
}

export function SevenDayTotalsBarChart({ itemMetrics, selectedItem, onItemSelect }: SevenDayTotalsBarChartProps) {
  const [showAll, setShowAll] = useState(false)

  if (itemMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7-Day Totals by Item</CardTitle>
          <CardDescription>Projected demand over the next 7 open days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No forecast data yet.
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedMetrics = [...itemMetrics].sort((a, b) => b.sevenDayTotal - a.sevenDayTotal)

  const displayMetrics = showAll ? sortedMetrics : sortedMetrics.slice(0, 10)

  const chartData = displayMetrics.map((metric) => ({
    item: metric.item,
    total: metric.sevenDayTotal,
    nextDay: metric.nextOpenDayTotal,
  }))

  const chartConfig = {
    total: {
      label: "7-Day Total",
      color: "#3EB489",
    },
  }

  const formatValue = (value: number) => {
    return Math.round(value).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">7-Day Totals by Item</CardTitle>
            <CardDescription>Projected demand over the next 7 open days</CardDescription>
          </div>
          {itemMetrics.length > 10 && (
            <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show Top 10" : "Show All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatValue} fontSize={12} />
              <YAxis
                type="category"
                dataKey="item"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={70}
                tickFormatter={(value) => (value.length > 10 ? value.substring(0, 10) + "..." : value)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => value}
                    formatter={(value, name, props) => {
                      const payload = props.payload as any
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">7-Day Total:</span>
                            <span className="font-bold">{formatValue(payload.total)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Next Open Day:</span>
                            <span>{formatValue(payload.nextDay)}</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => onItemSelect(data.item)}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.item === selectedItem ? "#3EB489" : "hsl(var(--muted))"}
                    opacity={entry.item === selectedItem ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
