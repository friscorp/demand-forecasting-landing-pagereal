"use client"

import { useForecast } from "@/lib/forecast-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, TrendingUp, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AuthStatus } from "@/components/auth-status"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getLatestRun } from "@/lib/api-client"

export default function Dashboard() {
  const { forecast, selectedItem, setSelectedItem, setForecast } = useForecast()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [isSynced, setIsSynced] = useState(false)
  const [isLoadingRun, setIsLoadingRun] = useState(true)

  useEffect(() => {
    const restoreLatestRun = async () => {
      if (authLoading) {
        return
      }

      // If we already have forecast, skip restoration
      if (forecast) {
        setIsLoadingRun(false)
        const runId = localStorage.getItem("dn_latest_run_id")
        setIsSynced(!!runId)
        return
      }

      if (!user) {
        // Not authenticated, try localStorage only
        const storedForecast = localStorage.getItem("dn_forecast_json")
        if (storedForecast) {
          try {
            const parsed = JSON.parse(storedForecast)
            console.log("[v0] Dashboard: restored forecast from localStorage", parsed)
            setForecast(parsed)
          } catch (error) {
            console.error("[v0] Failed to parse stored forecast:", error)
          }
        }
        setIsLoadingRun(false)
        return
      }

      // User is authenticated, try to fetch from backend
      try {
        console.log("[v0] Dashboard: Attempting GET /runs/latest...")
        const latestRun = await getLatestRun()

        if (latestRun) {
          console.log("[v0] Dashboard: GET /runs/latest success. Raw:", latestRun)

          // Normalize response
          const normalized = {
            id: latestRun.id,
            businessName: latestRun.business_name,
            mappingJson: latestRun.mapping_json,
            forecastJson: latestRun.forecast_json,
            insightsJson: latestRun.insights_json,
            createdAt: latestRun.created_at,
          }

          console.log("[v0] Dashboard: Normalized run:", normalized)

          if (!normalized.forecastJson) {
            console.error("[v0] Dashboard: Latest run missing forecastJson!", latestRun)
          }

          // Store in localStorage for offline access
          localStorage.setItem("dn_forecast_json", JSON.stringify(normalized.forecastJson))
          localStorage.setItem("dn_mapping_json", JSON.stringify(normalized.mappingJson))
          localStorage.setItem("dn_latest_run_id", String(normalized.id))
          localStorage.setItem("dn_latest_run", JSON.stringify(latestRun))

          // Update context
          setForecast(normalized.forecastJson)
          setIsSynced(true)

          // Clear onboarding state
          localStorage.removeItem("onboarding-step")
          localStorage.removeItem("onboarding-data")

          console.log("[v0] Dashboard: Restored from run ID", normalized.id)
        } else {
          console.log("[v0] Dashboard: No latest run found (404/empty)")

          // Fallback to localStorage
          const storedForecast = localStorage.getItem("dn_forecast_json")
          if (storedForecast) {
            try {
              const parsed = JSON.parse(storedForecast)
              console.log("[v0] Dashboard: Fallback to localStorage forecast", parsed)
              setForecast(parsed)
            } catch (error) {
              console.error("[v0] Failed to parse stored forecast:", error)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Dashboard: GET /runs/latest failed:", error)

        // Fallback to localStorage on error
        const storedForecast = localStorage.getItem("dn_forecast_json")
        if (storedForecast) {
          try {
            const parsed = JSON.parse(storedForecast)
            console.log("[v0] Dashboard: Error fallback to localStorage", parsed)
            setForecast(parsed)
          } catch (parseError) {
            console.error("[v0] Failed to parse stored forecast:", parseError)
          }
        }
      } finally {
        setIsLoadingRun(false)
      }
    }

    restoreLatestRun()
  }, [user, authLoading, forecast, setForecast])

  if (authLoading || isLoadingRun) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!forecast || !forecast.results) {
    console.error("[v0] Dashboard: no forecast or missing results", forecast)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="absolute right-6 top-6">
          <AuthStatus />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
            <CardTitle>No Forecast Available</CardTitle>
            <CardDescription>Complete the onboarding process to generate your first forecast</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/onboarding")} className="w-full">
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const resultsObj = forecast.results ?? {}
  const items = Object.keys(resultsObj)

  console.log("[v0] Dashboard: items found", items)

  if (items.length === 0) {
    console.error("[v0] Dashboard: no items in forecast results", forecast)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="absolute right-6 top-6">
          <AuthStatus />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
            <CardTitle>No Products Found</CardTitle>
            <CardDescription>The forecast returned no products. Please try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/onboarding")} className="w-full">
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentItem = selectedItem || items[0]
  const forecastData = resultsObj[currentItem]?.forecast || []

  console.log("[v0] Dashboard: displaying forecast for", currentItem, "rows:", forecastData.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="absolute right-6 top-6">
        <AuthStatus />
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-secondary">Demand Forecast Dashboard</h1>
            <p className="text-muted-foreground">AI-powered demand predictions for the next 7 days</p>
          </div>
          {isSynced && (
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
                <CardDescription>Select a product to view its demand forecast</CardDescription>
              </div>
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
            </div>
          </CardHeader>
          <CardContent>
            {forecastData.length > 0 ? (
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
              <div className="py-8 text-center text-muted-foreground">No forecast data available for this product.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
