"use client"

import { useForecast } from "@/lib/forecast-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { latestRun, latestRunHourly } from "@/lib/api"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { loadOrComputeHourMask, type HourMask } from "@/lib/hour-mask"
import { computeItemMetrics, type ItemMetrics } from "@/lib/compute-item-metrics"

export default function Items() {
  const { forecast, selectedItem, setSelectedItem, setForecast } = useForecast()
  const { user, loading: authLoading } = useAuth()
  const [businessProfile, setBusinessProfile] = useState<any>(null)
  const [hourlyForecast, setHourlyForecast] = useState<any>(null)
  const [hourMask, setHourMask] = useState<HourMask | null>(null)
  const [itemMetrics, setItemMetrics] = useState<ItemMetrics[]>([])
  const [sortBy, setSortBy] = useState<"sevenDayTotal" | "nextOpenDayTotal" | "peak" | "uncertainty">("sevenDayTotal")
  const [forecastMode, setForecastMode] = useState<"daily" | "hourly">("daily")
  const [maskEnabled, setMaskEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (authLoading || !user) {
        setIsLoading(false)
        return
      }

      try {
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))
        if (profileDoc.exists()) {
          setBusinessProfile(profileDoc.data())
        }

        if (!forecast) {
          const run = await latestRun()
          if (run && run.forecast) {
            setForecast(run.forecast)
          }
        }

        const hourlyRun = await latestRunHourly()
        if (hourlyRun && hourlyRun.forecast) {
          setHourlyForecast(hourlyRun.forecast)
        }

        if (user && profileDoc.exists()) {
          const profile = profileDoc.data()
          const mask = await loadOrComputeHourMask(user.uid, profile.hours, profile.timezone)
          setHourMask(mask)
        }
      } catch (error) {
        console.error("[v0] Items: error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, authLoading, forecast, setForecast])

  useEffect(() => {
    const activeForecast = forecastMode === "hourly" ? hourlyForecast : forecast
    if (!activeForecast || !activeForecast.results) {
      setItemMetrics([])
      return
    }

    const metrics = computeItemMetrics(activeForecast, businessProfile, hourMask, forecastMode, maskEnabled)

    const sorted = [...metrics].sort((a, b) => {
      if (sortBy === "peak") {
        return b.peak.value - a.peak.value
      }
      return b[sortBy] - a[sortBy]
    })

    setItemMetrics(sorted)
  }, [forecast, hourlyForecast, forecastMode, businessProfile, hourMask, sortBy, maskEnabled])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Items</h1>
          <p className="text-muted-foreground">Manage your product inventory and view detailed metrics</p>
        </div>

        {itemMetrics.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Items</CardTitle>
                  <CardDescription>Overview of all products with key metrics</CardDescription>
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sevenDayTotal">7-Day Total</SelectItem>
                    <SelectItem value="nextOpenDayTotal">Next Open Day</SelectItem>
                    <SelectItem value="peak">Peak Value</SelectItem>
                    <SelectItem value="uncertainty">Uncertainty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {itemMetrics.map((metric) => (
                  <Card
                    key={metric.item}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedItem === metric.item ? "border-primary shadow-md" : ""
                    }`}
                    onClick={() => setSelectedItem(metric.item)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{metric.item}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Next Open Day:</span>
                        <span className="font-semibold">{metric.nextOpenDayTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">7-Day Total:</span>
                        <span className="font-semibold">{metric.sevenDayTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peak:</span>
                        <span className="font-semibold">
                          {metric.peak.label} ({metric.peak.value})
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Uncertainty:</span>
                        <span className="font-semibold">±{metric.uncertainty}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Management
              </CardTitle>
              <CardDescription>No items found. Generate a forecast to see your products here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Complete onboarding to view item metrics</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
