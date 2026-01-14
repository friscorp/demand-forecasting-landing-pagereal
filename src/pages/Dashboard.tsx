"use client"

import { useForecast } from "@/lib/forecast-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, TrendingUp, CheckCircle2, AlertCircle, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AuthStatus } from "@/components/auth-status"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { latestRun } from "@/lib/api"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

          // Check if profile is incomplete (missing required fields)
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
        // Still show banner if we can't determine profile status
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
          // Don't show setup banner if we already have a profile
          if (!businessProfile) {
            setShowSetupBanner(true)
          }
        }
      } catch (error) {
        console.error("[v0] Dashboard: latestRun error:", error)
        // Don't throw - just log and show empty state
      } finally {
        setIsLoadingRun(false)
      }
    }

    loadData()
  }, [user, authLoading, forecast, setForecast, navigate])

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
          {isSynced && hasForecastData && (
            <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Synced
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Forecast</CardTitle>
                <CardDescription>
                  {hasForecastData
                    ? "Select a product to view its demand forecast"
                    : "Complete onboarding to generate your first forecast"}
                </CardDescription>
              </div>
              {hasForecastData && (
                <Select value={currentItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasForecastData && forecastData.length > 0 ? (
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
                      <TableCell className="text-right text-muted-foreground">{point.yhat_lower.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{point.yhat_upper.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No forecasting data available</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Complete the onboarding process to generate your first forecast
                </p>
                <Button onClick={() => navigate("/onboarding")}>Create one</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast Visualization</CardTitle>
            <CardDescription>Visual representation of demand trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <p className="text-muted-foreground">Graph coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
