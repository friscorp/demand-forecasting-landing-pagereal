"use client"

import { useForecast } from "@/lib/forecast-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingDown,
  Package,
  Megaphone,
  ExternalLink,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AuthStatus } from "@/components/auth-status"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { latestRun, latestRunHourly, forecastHourly, saveRunHourly } from "@/lib/api"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HourlyForecastTable } from "@/components/HourlyForecastTable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadOrComputeHourMask, type HourMask } from "@/lib/hour-mask"
import { BackgroundForecastChart } from "@/components/BackgroundForecastChart"

export default function Dashboard() {
  const { forecast, selectedItem, setSelectedItem, setForecast } = useForecast()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [isSynced, setIsSynced] = useState(false)
  const [isLoadingRun, setIsLoadingRun] = useState(true)
  const [businessProfile, setBusinessProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [showSetupBanner, setShowSetupBanner] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const [hourlyForecast, setHourlyForecast] = useState<any>(null)
  const [hourlyItems, setHourlyItems] = useState<string[]>([])
  const [isLoadingHourly, setIsLoadingHourly] = useState(false)
  const [forecastMode, setForecastMode] = useState<"daily" | "hourly">("daily")
  const [isGeneratingHourly, setIsGeneratingHourly] = useState(false)
  const [hourlyGenerateError, setHourlyGenerateError] = useState<string | null>(null)
  const [hourMask, setHourMask] = useState<HourMask | null>(null)
  const [maskEnabled, setMaskEnabled] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!user) {
        console.log("[v0] Dashboard: user not authenticated")
        setIsLoadingRun(false)
        setIsLoadingProfile(false)
        return
      }

      try {
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))
        if (profileDoc.exists()) {
          const profile = profileDoc.data()
          setBusinessProfile(profile)
          console.log("[v0] Dashboard: business profile loaded", profile)

          const requiredFields = ["name", "category", "timezone"]
          const isIncomplete = requiredFields.some((field) => !profile[field])
          if (isIncomplete) {
            setShowSetupBanner(true)
          }
        } else {
          console.log("[v0] Dashboard: no business profile found")
          setShowSetupBanner(true)
        }
      } catch (error) {
        console.error("[v0] Dashboard: error fetching business profile:", error)
        setShowSetupBanner(true)
      } finally {
        setIsLoadingProfile(false)
      }

      if (forecast && forecast.results) {
        console.log("[v0] Dashboard: forecast already in context")
        setIsLoadingRun(false)
        setIsSynced(true)
        return
      }

      try {
        console.log("[v0] Dashboard: calling latestRun...")
        const run = await latestRun()

        if (run && run.forecast && run.forecast.results) {
          console.log("[v0] Dashboard: latestRun success, items:", Object.keys(run.forecast.results))
          setForecast(run.forecast)
          setIsSynced(true)
        } else {
          console.log("[v0] Dashboard: no run found or missing forecast data")
          if (!businessProfile) {
            setShowSetupBanner(true)
          }
        }
      } catch (error) {
        console.error("[v0] Dashboard: latestRun error:", error)
      } finally {
        setIsLoadingRun(false)
      }
    }

    loadData()
  }, [user, authLoading, forecast, setForecast, navigate])

  useEffect(() => {
    const loadHourlyData = async () => {
      if (forecastMode !== "hourly" || !user || authLoading) return
      if (hourlyForecast) return // Already loaded

      setIsLoadingHourly(true)
      try {
        console.log("[v0] Dashboard: loading hourly forecast...")
        const hourlyRun = await latestRunHourly()

        if (hourlyRun && hourlyRun.forecast && hourlyRun.forecast.results) {
          console.log("[v0] Dashboard: hourly forecast loaded, items:", Object.keys(hourlyRun.forecast.results))
          setHourlyForecast(hourlyRun.forecast)
          setHourlyItems(Object.keys(hourlyRun.forecast.results))

          if (businessProfile) {
            console.log("[v0] Dashboard: calling loadOrComputeHourMask with businessProfile:", {
              hasHours: !!businessProfile.hours,
              timezone: businessProfile.timezone,
            })
            const mask = await loadOrComputeHourMask(user.uid, businessProfile.hours, businessProfile.timezone)
            console.log("[v0] Dashboard: hour mask loaded/computed:", mask)
            setHourMask(mask)
          } else {
            console.log("[v0] Dashboard: no businessProfile available, skipping hour mask")
          }
        } else {
          console.log("[v0] Dashboard: no hourly forecast found")
        }
      } catch (error) {
        console.error("[v0] Dashboard: error loading hourly forecast:", error)
      } finally {
        setIsLoadingHourly(false)
      }
    }

    loadHourlyData()
  }, [forecastMode, user, authLoading, hourlyForecast, businessProfile])

  const handleGenerateHourlyForecast = async () => {
    if (!user || !businessProfile) {
      setHourlyGenerateError("Please complete business setup first")
      return
    }

    setIsGeneratingHourly(true)
    setHourlyGenerateError(null)

    try {
      console.log("[v0] Dashboard: generating hourly forecast...")

      const hourlyResult = await forecastHourly({ horizonDays: 7 })

      const businessName = businessProfile.name || "Business"
      const mapping = forecast?.results ? Object.values(forecast.results)[0]?.meta?.mapping || {} : {}

      await saveRunHourly({
        businessName,
        mapping,
        forecast: hourlyResult,
        insights: null,
      })

      const latest = await latestRunHourly()

      if (latest && latest.forecast && latest.forecast.results) {
        console.log("[v0] Dashboard: hourly forecast saved and loaded successfully")
        setHourlyForecast(latest.forecast)
        setHourlyItems(Object.keys(latest.forecast.results))

        if (businessProfile) {
          const mask = await loadOrComputeHourMask(user.uid, businessProfile.hours, businessProfile.timezone)
          setHourMask(mask)
        }
      }
    } catch (error: any) {
      console.error("[v0] Dashboard: error generating hourly forecast:", error)
      setHourlyGenerateError(error.message || "Failed to generate hourly forecast")
    } finally {
      setIsGeneratingHourly(false)
    }
  }

  if (authLoading || isLoadingRun || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const resultsObj = forecast?.results ?? {}
  const items = Object.keys(resultsObj)
  const hasForecastData = items.length > 0
  const currentItem = selectedItem || items[0]
  const forecastData = hasForecastData ? resultsObj[currentItem]?.forecast || [] : []

  const hourlyResultsObj = hourlyForecast?.results ?? {}
  const hasHourlyData = hourlyItems.length > 0
  const currentHourlyItem = selectedItem || hourlyItems[0]
  const hourlyForecastData = hasHourlyData ? hourlyResultsObj[currentHourlyItem]?.forecast || [] : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="absolute right-6 top-6">
        <AuthStatus />
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        {showSetupBanner && !bannerDismissed && (
          <Alert className="relative border-primary bg-primary/10">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="flex items-center justify-between gap-4 pr-8">
              <span className="text-base font-medium">Finish setting up your business to generate forecasts</span>
              <Button onClick={() => navigate("/onboarding")} size="sm" className="shrink-0">
                Complete Business Setup
              </Button>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => setBannerDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-secondary">Demand Forecast Dashboard</h1>
            <p className="text-muted-foreground">AI-powered demand predictions for the next 7 days</p>
          </div>
          {isSynced && (hasForecastData || hasHourlyData) && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Synced
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {hasForecastData || hasHourlyData
                  ? "Review your forecast predictions"
                  : "Complete onboarding to get started"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Insights</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommended Promotions</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low-Stock Alerts</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Forecast</CardTitle>
                <CardDescription>
                  {hasForecastData || hasHourlyData
                    ? "Select a product to view its demand forecast"
                    : "Complete onboarding to generate your first forecast"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <Tabs value={forecastMode} onValueChange={(v) => setForecastMode(v as "daily" | "hourly")}>
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="hourly">Hourly</TabsTrigger>
                  </TabsList>
                </Tabs>

                {((forecastMode === "daily" && hasForecastData) || (forecastMode === "hourly" && hasHourlyData)) && (
                  <Select value={currentItem || currentHourlyItem} onValueChange={setSelectedItem}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {(forecastMode === "daily" ? items : hourlyItems).map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {((forecastMode === "daily" && hasForecastData) || (forecastMode === "hourly" && hasHourlyData)) && (
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate("/items")} className="gap-2">
                  <Package className="h-4 w-4" />
                  View detailed metrics for {currentItem || currentHourlyItem}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}

            {forecastMode === "daily" ? (
              hasForecastData && forecastData.length > 0 ? (
                <div className="relative min-h-[400px]">
                  <BackgroundForecastChart data={forecastData} />
                  <div className="relative z-10">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Predicted Demand</TableHead>
                          <TableHead className="text-right">Lower Bound</TableHead>
                          <TableHead className="text-right">Upper Bound</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forecastData.map((point, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {new Date(point.ds).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{Math.round(point.yhat)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {point.yhat_lower.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {point.yhat_upper.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="relative min-h-[400px]">
                  <BackgroundForecastChart data={[]} />
                  <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No forecast data yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Complete the onboarding process to generate your first forecast
                    </p>
                    <Button onClick={() => navigate("/onboarding")}>Create one</Button>
                  </div>
                </div>
              )
            ) : isLoadingHourly ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading hourly forecast...</p>
              </div>
            ) : hasHourlyData && hourlyForecastData.length > 0 ? (
              <HourlyForecastTable
                selectedItem={currentHourlyItem}
                hourlyForecastForItem={hourlyForecastData}
                businessProfile={businessProfile}
                hourMask={hourMask}
                maskEnabled={maskEnabled}
                onMaskEnabledChange={setMaskEnabled}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No hourly forecast yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Generate an hourly forecast to see detailed predictions
                </p>
                {hourlyGenerateError && (
                  <Alert variant="destructive" className="mb-4 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{hourlyGenerateError}</AlertDescription>
                  </Alert>
                )}
                <Button onClick={handleGenerateHourlyForecast} disabled={isGeneratingHourly}>
                  {isGeneratingHourly ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    "Generate Hourly Forecast"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
