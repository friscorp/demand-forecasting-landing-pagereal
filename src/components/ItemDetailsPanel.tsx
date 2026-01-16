"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, TrendingUp, Calendar, Activity, AlertCircle } from "lucide-react"
import type { ItemMetrics } from "@/lib/compute-item-metrics"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts"
import { parseISOToZonedParts } from "@/lib/time-filtering"
import type { ForecastPoint } from "@/lib/api"

type ItemDetailsPanelProps = {
  itemName: string
  itemMetrics: ItemMetrics
  forecastData: ForecastPoint[]
  timezone: string
  mode: "daily" | "hourly"
  onClose: () => void
}

export function ItemDetailsPanel({
  itemName,
  itemMetrics,
  forecastData,
  timezone,
  mode,
  onClose,
}: ItemDetailsPanelProps) {
  const chartData = forecastData.slice(0, mode === "daily" ? 7 : 24).map((point) => {
    const parts = parseISOToZonedParts(point.ds, timezone)
    let label: string

    if (mode === "hourly") {
      const hh = parts.hour % 12 || 12
      const period = parts.hour < 12 ? "AM" : "PM"
      label = `${hh}${period}`
    } else {
      const date = new Date(point.ds)
      label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    return {
      label,
      forecast: Math.round(point.yhat),
      lower: Math.round(point.yhat_lower),
      upper: Math.round(point.yhat_upper),
      average: Math.round((point.yhat_upper + point.yhat_lower) / 2),
      timestamp: point.ds,
    }
  })

  const chartConfig = {
    forecast: {
      label: "Forecast",
      color: "hsl(var(--primary))",
    },
    average: {
      label: "Average",
      color: "#3EB489",
    },
    lower: {
      label: "Lower Bound",
      color: "hsl(var(--muted-foreground))",
    },
    upper: {
      label: "Upper Bound",
      color: "hsl(var(--muted-foreground))",
    },
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-2xl font-bold">{itemName}</h2>
          <p className="text-sm text-muted-foreground">{mode === "daily" ? "Next 7 Days" : "Next 24 Hours"} Forecast</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demand Forecast</CardTitle>
            <CardDescription>Predicted demand with confidence intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(value, payload) => {
                          if (payload && payload[0]) {
                            const timestamp = payload[0].payload.timestamp
                            const date = new Date(timestamp)
                            if (mode === "hourly") {
                              return date.toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                              })
                            }
                            return date.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          }
                          return value
                        }}
                      />
                    }
                  />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--muted))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--muted))" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="average" stroke="#3EB489" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Next Open Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itemMetrics.nextOpenDayTotal}</div>
              <p className="text-xs text-muted-foreground mt-1">Expected demand</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                7-Day Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itemMetrics.sevenDayTotal}</div>
              <p className="text-xs text-muted-foreground mt-1">Cumulative forecast</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" />
                Peak Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itemMetrics.peak.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{itemMetrics.peak.label}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-primary" />
                Uncertainty
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">±{itemMetrics.uncertainty}</div>
              <p className="text-xs text-muted-foreground mt-1">Average variance</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>
                  Peak demand expected {itemMetrics.peak.label} with {itemMetrics.peak.value} units
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>Average daily demand of {Math.round(itemMetrics.sevenDayTotal / 7)} units over next week</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>Forecast confidence range: ±{itemMetrics.uncertainty} units</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
