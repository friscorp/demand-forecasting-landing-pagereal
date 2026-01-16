"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { PromotionSimulator } from "@/components/PromotionSimulator"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getLatestDailyRun, getLatestHourlyRun } from "@/lib/runs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getAllPromotions, deactivatePromotion, reactivatePromotion } from "@/lib/promotions"
import type { Promotion } from "@/lib/applyPromotionsToForecast"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { ManualPromotionForm } from "@/components/ManualPromotionForm"

export default function Promotions() {
  const { user, loading: authLoading } = useAuth()
  const [hasData, setHasData] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false)

  useEffect(() => {
    async function checkData() {
      if (authLoading || !user) {
        setIsLoading(false)
        return
      }

      try {
        const dailyRun = await getLatestDailyRun(user.uid)
        const hourlyRun = await getLatestHourlyRun(user.uid)

        const allItems = new Set<string>()

        if (dailyRun?.forecast?.results) {
          Object.keys(dailyRun.forecast.results).forEach((item) => allItems.add(item))
        }

        if (hourlyRun?.forecast?.results) {
          Object.keys(hourlyRun.forecast.results).forEach((item) => allItems.add(item))
        }

        setItems(Array.from(allItems))
        setHasData(allItems.size > 0)
      } catch (err) {
        console.error("error checking forecast data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    checkData()
  }, [user, authLoading])

  useEffect(() => {
    async function loadPromotions() {
      if (!user) return

      setIsLoadingPromotions(true)
      try {
        const promos = await getAllPromotions(user.uid)
        setPromotions(promos)
      } catch (err) {
        console.error("error loading promotions:", err)
      } finally {
        setIsLoadingPromotions(false)
      }
    }

    if (user) {
      loadPromotions()
    }
  }, [user])

  const handleTogglePromotion = async (promotionId: string, currentStatus: string) => {
    if (!user) return

    try {
      if (currentStatus === "active") {
        await deactivatePromotion(user.uid, promotionId)
      } else {
        await reactivatePromotion(user.uid, promotionId)
      }

      // Reload promotions
      const promos = await getAllPromotions(user.uid)
      setPromotions(promos)
    } catch (err) {
      console.error("error toggling promotion:", err)
    }
  }

  const handlePromotionCreated = async () => {
    // Reload promotions list
    if (user) {
      const promos = await getAllPromotions(user.uid)
      setPromotions(promos)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const activePromoCount = promotions.filter((p) => p.status === "active").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Promotions</h1>
          <p className="text-muted-foreground">Create and manage promotional campaigns</p>
        </div>

        {!hasData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Generate a forecast on the Dashboard to use the promotion simulator.</AlertDescription>
          </Alert>
        )}

        {activePromoCount > 0 && (
          <Alert className="border-primary/30 bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
            <AlertDescription>
              <span className="font-semibold text-primary">
                {activePromoCount} active promotion{activePromoCount !== 1 ? "s" : ""}
              </span>{" "}
              currently adjusting forecast values across all views.
            </AlertDescription>
          </Alert>
        )}

        {hasData && <ManualPromotionForm items={items} onSuccess={handlePromotionCreated} />}

        {hasData && <PromotionSimulator items={items} />}

        {promotions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Active Promotions
              </CardTitle>
              <CardDescription>Manage your promotional campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPromotions ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.item || "All items"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(promo.start).toLocaleDateString()} - {new Date(promo.end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{promo.multiplier.toFixed(2)}x</TableCell>
                        <TableCell>{(promo.confidence * 100).toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge variant={promo.status === "active" ? "default" : "outline"}>{promo.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={promo.status === "active"}
                            onCheckedChange={() => handleTogglePromotion(promo.id, promo.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
