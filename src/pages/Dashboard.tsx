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
  Upload,
  Sparkles,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AuthStatus } from "@/components/auth-status"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { forecastHourly, saveRunHourly } from "@/lib/api"
import { getLatestDailyRun, getLatestHourlyRun } from "@/lib/runs"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { HourlyForecastTable } from "@/components/HourlyForecastTable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loadOrComputeHourMask, type HourMask } from "@/lib/hour-mask"
import { BackgroundForecastChart } from "@/components/BackgroundForecastChart"
import { HistoryCompare } from "@/components/HistoryCompare"
import { AiInsightsSection } from "@/components/AiInsightsSection"
import { AskAiInput } from "@/components/AskAiInput"
import { getActivePromotions } from "@/lib/promotions"
import { applyPromotionsToForecast, countActivePromotions } from "@/lib/applyPromotionsToForecast"
import type { Promotion } from "@/lib/applyPromotionsToForecast"

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
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [adjustedForecast, setAdjustedForecast] = useState<any>(null)
  const [adjustedHourlyForecast, setAdjustedHourlyForecast] = useState<any>(null)
  const [isAskAiOpen, setIsAskAiOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!user) {
        setIsLoadingRun(false)
        setIsLoadingProfile(false)
        return
      }

      try {
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))
        if (profileDoc.exists()) {
          const profile = profileDoc.data()
          setBusinessProfile(profile)

          const requiredFields = ["name", "industry", "location", "timezone", "unitOfMeasure", "leadTime", "hours"]
          const isIncomplete = requiredFields.some((field) => !profile[field])
          if (isIncomplete) {
            setShowSetupBanner(true)
          }
        } else {
          setShowSetupBanner(true)
        }
      } catch (error) {
        console.error("error fetching business profile:", error)
        setShowSetupBanner(true)
      } finally {
        setIsLoadingProfile(false)
      }

      if (forecast && forecast.results) {
        setIsLoadingRun(false)
        setIsSynced(true)
        return
      }

      try {
        const run = await getLatestDailyRun(user.uid)

        if (run && run.forecast && run.forecast.results) {
          setForecast(run.forecast)
          setIsSynced(true)
        } else {
          if (!businessProfile) {
            setShowSetupBanner(true)
          }
        }
      } catch (error) {
        console.error("error loading daily run:", error)
      } finally {
        setIsLoadingRun(false)
      }
    }

    loadData()
  }, [user, authLoading, forecast, setForecast, navigate])

  useEffect(() => {
    const loadHourlyData = async () => {
      if (forecastMode !== "hourly" || !user || authLoading) return
      if (hourlyForecast) return

      setIsLoadingHourly(true)
      try {
        const hourlyRun = await getLatestHourlyRun(user.uid)

        if (hourlyRun && hourlyRun.forecast && hourlyRun.forecast.results) {
          setHourlyForecast(hourlyRun.forecast)
          setHourlyItems(Object.keys(hourlyRun.forecast.results))

          if (businessProfile) {
            const mask = await loadOrComputeHourMask(user.uid, businessProfile.hours, businessProfile.timezone)
            setHourMask(mask)
          }
        }
      } catch (error) {
        console.error("error loading hourly forecast:", error)
      } finally {
        setIsLoadingHourly(false)
      }
    }

    loadHourlyData()
  }, [forecastMode, user, authLoading, hourlyForecast, businessProfile])

  useEffect(() => {
    const loadPromotions = async () => {
      if (!user) return

      try {
        const promos = await getActivePromotions(user.uid)
        setPromotions(promos)
      } catch (error) {
        console.error("error loading promotions:", error)
      }
    }

    if (user) {
      loadPromotions()
    }
  }, [user])

  useEffect(() => {
    if (forecast && promotions.length > 0) {
      const adjusted = applyPromotionsToForecast(forecast, promotions, businessProfile?.timezone)
      setAdjustedForecast(adjusted)
    } else {
      setAdjustedForecast(forecast)
    }
  }, [forecast, promotions, businessProfile])

  useEffect(() => {
    if (hourlyForecast && promotions.length > 0) {
      const adjusted = applyPromotionsToForecast(hourlyForecast, promotions, businessProfile?.timezone)
      setAdjustedHourlyForecast(adjusted)
    } else {
      setAdjustedHourlyForecast(hourlyForecast)
    }
  }, [hourlyForecast, promotions, businessProfile])

  const handleGenerateHourlyForecast = async () => {
    if (!user || !businessProfile) {
      setHourlyGenerateError("Please complete business setup first")
      return
    }

    setIsGeneratingHourly(true)
    setHourlyGenerateError(null)

    try {
      let hourMask: HourMask | null = null
      try {
        hourMask = await loadOrComputeHourMask(user.uid, businessProfile.hours, businessProfile.timezone)
      } catch (maskError) {
        console.error("Failed to load hour mask (non-blocking):", maskError)
      }

      const hourlyResult = await forecastHourly({
        horizonDays: 7,
        hourMask: hourMask || undefined,
      })

      const businessName = businessProfile.name || "Business"
      const mapping = forecast?.results ? Object.values(forecast.results)[0]?.meta?.mapping || {} : {}

      await saveRunHourly({
        businessName,
        mapping,
        forecast: hourlyResult,
        insights: null,
      })

      const latest = await getLatestHourlyRun(user.uid)

      if (latest && latest.forecast && latest.forecast.results) {
        setHourlyForecast(latest.forecast)
        setHourlyItems(Object.keys(latest.forecast.results))

        if (businessProfile) {
          const mask = await loadOrComputeHourMask(user.uid, businessProfile.hours, businessProfile.timezone)
          setHourMask(mask)
        }
      }
    } catch (error: any) {
      console.error("error generating hourly forecast:", error)
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

  const resultsObj = adjustedForecast?.results ?? {}
  const items = Object.keys(resultsObj)
  const hasForecastData = items.length > 0
  const currentItem = selectedItem || items[0]
  const forecastData = hasForecastData ? resultsObj[currentItem]?.forecast || [] : []

  const hourlyResultsObj = adjustedHourlyForecast?.results ?? {}
  const hasHourlyData = hourlyItems.length > 0
  const currentHourlyItem = selectedItem || hourlyItems[0]
  const hourlyForecastData = hasHourlyData ? hourlyResultsObj[currentHourlyItem]?.forecast || [] : []

  const activePromoCount = countActivePromotions(forecast || {}, promotions)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="absolute right-6 top-6">
        <AuthStatus />
      </div>

      <div
        className={`mx-auto transition-all duration-300 space-y-6 ${isAskAiOpen ? "max-w-full pr-96" : "max-w-6xl"}`}
      >
        {showSetupBanner && !bannerDismissed && (
          <div className="mb-6 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <AlertCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Finish setting up your business to generate forecasts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete your business profile to start forecasting demand
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/business-settings")} className="bg-primary hover:bg-primary/90">
                  Complete Business Setup
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setBannerDismissed(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activePromoCount > 0 && (hasForecastData || hasHourlyData) && (
          <Alert className="border-primary/30 bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Adjusted for <span className="font-semibold">{activePromoCount}</span> active promotion
                {activePromoCount !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/promotions")} className="gap-2">
                Manage Promotions
                <ExternalLink className="h-3 w-3" />
              </Button>
            </AlertDescription>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate("/business-settings")
                setTimeout(() => {
                  document.getElementById("holidays-section")?.scrollIntoView({ behavior: "smooth" })
                }, 100)
              }}
              className="relative gap-2 overflow-hidden border-2 border-transparent bg-gradient-to-r from-[#3EB489] via-blue-500 to-[#3EB489] p-[2px] hover:shadow-lg transition-shadow"
            >
              <span className="flex items-center gap-2 rounded-sm bg-background px-3 py-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#3EB489] to-blue-500">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium">Suggested Holidays</span>
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigate("/business-settings")
              setTimeout(() => {
                document.getElementById("sales-data")?.scrollIntoView({ behavior: "smooth" })
              }, 100)
            }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            Update sales data
          </Button>
          {isSynced && (hasForecastData || hasHourlyData) && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Synced
            </div>
          )}
        </div>

        {(hasForecastData || hasHourlyData) && (
          <div className="flex justify-center">
            <Button
              onClick={() => setIsAskAiOpen(!isAskAiOpen)}
              className="rounded-full bg-primary px-6 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              <span className="font-medium">Ask AI</span>
            </Button>
          </div>
        )}

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

        {(hasForecastData || hasHourlyData) && <AiInsightsSection hasForecastData={hasForecastData || hasHourlyData} />}

        {forecastMode === "hourly" && hasHourlyData && (
          <HistoryCompare items={hourlyItems} selectedItem={currentHourlyItem} />
        )}
      </div>

      {isAskAiOpen && (
        <div className="fixed right-0 top-0 h-screen w-[40%] bg-background border-l border-border shadow-2xl overflow-y-auto transition-transform duration-300 z-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask AI
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsAskAiOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Asking about:</label>
            <Select value={forecastMode === "daily" ? currentItem : currentHourlyItem} onValueChange={setSelectedItem}>
              <SelectTrigger className="w-full">
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
          </div>

          <AskAiInput itemContext={forecastMode === "daily" ? currentItem : currentHourlyItem} className="h-full" />
        </div>
      )}
    </div>
  )
}
