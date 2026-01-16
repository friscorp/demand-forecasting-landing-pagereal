"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, AlertCircle, Loader2, Check } from "lucide-react"
import { fetchPromoMultiplier } from "@/api/ai"
import type { PromoInput, AiPromoMultiplierResponse } from "@/api/ai"
import { savePromotion } from "@/lib/promotions"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

interface PromotionSimulatorProps {
  selectedItem?: string
  items?: string[]
}

export function PromotionSimulator({ selectedItem, items = [] }: PromotionSimulatorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [item, setItem] = useState(selectedItem || "All items")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("20:00")
  const [offer, setOffer] = useState("")
  const [channel, setChannel] = useState<"in_store" | "online" | "both">("both")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AiPromoMultiplierResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const handleEstimate = async () => {
    if (!item || !startDate || !endDate) {
      setError("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)

    try {
      const promoInput: PromoInput = {
        item,
        start: `${startDate}T${startTime}:00`,
        end: `${endDate}T${endTime}:00`,
        offer: offer || null,
        channel,
      }

      const response = await fetchPromoMultiplier(promoInput)
      setResult(response)
    } catch (err: any) {
      setError(err.message || "Failed to estimate promo impact")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    if (!result?.multiplier || !user) return

    setIsApplying(true)
    setError(null)

    try {
      await savePromotion(user.uid, {
        item: item || null,
        start: `${startDate}T${startTime}:00`,
        end: `${endDate}T${endTime}:00`,
        offer: offer || null,
        channel,
        multiplier: result.multiplier,
        confidence: result.confidence ?? 0,
        rating_0to10: result.rating_0to10 ?? 0,
        metrics: {
          expectedLiftPct: result.promo?.estimatedLiftPct ?? 0,
          baselineUnitsEstimate: result.promo?.baselineUnitsEstimate ?? null,
          promoUnitsEstimate: result.promo?.promoUnitsEstimate ?? null,
        },
        warnings: result.risks ?? [],
      })

      setApplied(true)
      toast({
        title: "Promotion Applied",
        description: "Forecast views will reflect this change.",
      })
    } catch (err: any) {
      setError(err.message || "Failed to apply promotion")
      toast({
        title: "Error",
        description: err.message || "Failed to apply promotion",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          Promotion Simulator
        </CardTitle>
        <CardDescription>Estimate the impact of promotions on demand forecasts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promo-item">Item *</Label>
            {items.length > 0 ? (
              <Select value={item} onValueChange={setItem}>
                <SelectTrigger id="promo-item">
                  <SelectValue placeholder="Select item or All items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All items">All items</SelectItem>
                  {items.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="promo-item"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Product name or leave empty for all"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-channel">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger id="promo-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_store">In Store</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-start-date">Start Date *</Label>
            <Input id="promo-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-start-time">Start Time</Label>
            <Input id="promo-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-end-date">End Date *</Label>
            <Input id="promo-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-end-time">End Time</Label>
            <Input id="promo-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="promo-offer">Offer Description (optional)</Label>
          <Textarea
            id="promo-offer"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="e.g., 20% off, Buy 1 Get 1, Free shipping"
            rows={2}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleEstimate} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Estimating...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Estimate Promo Impact
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-primary">Estimated Impact</h4>
                <p className="text-sm text-muted-foreground mt-1">{result.short}</p>
              </div>
              {applied ? (
                <Badge className="shrink-0 bg-green-500">
                  <Check className="mr-1 h-3 w-3" />
                  Applied
                </Badge>
              ) : result.confidence < 0.4 ? (
                <Badge variant="destructive" className="shrink-0">
                  Low Confidence
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {result.multiplier && (
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Multiplier</p>
                  <p className="text-2xl font-bold text-primary">{result.multiplier.toFixed(2)}x</p>
                </div>
              )}

              {result.rating_0to10 !== undefined && (
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{result.rating_0to10.toFixed(1)}/10</p>
                </div>
              )}

              <div className="rounded-md bg-background p-3">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{(result.confidence * 100).toFixed(0)}%</p>
              </div>

              {result.promo?.estimatedLiftPct !== undefined && (
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Est. Lift</p>
                  <p className="text-2xl font-bold text-primary">+{result.promo.estimatedLiftPct.toFixed(0)}%</p>
                </div>
              )}
            </div>

            {result.detailed && (
              <div className="rounded-md bg-background p-3">
                <p className="text-sm text-muted-foreground">{result.detailed}</p>
              </div>
            )}

            {result.risks && result.risks.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">Warnings:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.risks.map((risk, i) => (
                      <li key={i}>{typeof risk === "string" ? risk : risk.title || risk.detail || "Warning"}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.multiplier && !applied && (
              <Button onClick={handleApply} disabled={isApplying} className="w-full bg-primary hover:bg-primary/90">
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Promotion to Forecast"
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
