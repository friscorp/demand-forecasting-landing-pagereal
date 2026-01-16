"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { PromotionSimulator } from "@/components/PromotionSimulator"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getLatestHourlyRun } from "@/lib/runs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function Promotions() {
  const { user, loading: authLoading } = useAuth()
  const [hasHourlyData, setHasHourlyData] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkHourlyData() {
      if (authLoading || !user) {
        setIsLoading(false)
        return
      }

      try {
        const run = await getLatestHourlyRun(user.uid)
        setHasHourlyData(!!run)
      } catch (err) {
        console.error("error checking hourly data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    checkHourlyData()
  }, [user, authLoading])

  const handleApplyPromo = async (multiplier: number) => {
    console.log("Applying multiplier:", multiplier)
    // This will call the backend to adjust the hourly forecast with the multiplier
    // and then re-fetch the latest hourly run
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Promotions</h1>
          <p className="text-muted-foreground">Create and manage promotional campaigns</p>
        </div>

        {!hasHourlyData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Generate an hourly forecast on the Dashboard to use the promotion simulator.
            </AlertDescription>
          </Alert>
        )}

        {hasHourlyData && <PromotionSimulator onApplyPromo={handleApplyPromo} />}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaign Management
            </CardTitle>
            <CardDescription>Plan and execute marketing promotions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Campaign management coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
