"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { savePromotion } from "@/lib/promotions"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type ManualPromotionFormProps = {
  items: string[]
  onSuccess?: () => void
}

export function ManualPromotionForm({ items, onSuccess }: ManualPromotionFormProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    item: "All items",
    offer: "",
    start: "",
    end: "",
    multiplier: "1.15",
    channel: "both" as "online" | "instore" | "both",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate dates
      if (!formData.start || !formData.end) {
        throw new Error("Please provide both start and end dates")
      }

      if (new Date(formData.start) >= new Date(formData.end)) {
        throw new Error("End date must be after start date")
      }

      // Format dates to ISO strings
      const startISO = new Date(formData.start).toISOString().slice(0, 19)
      const endISO = new Date(formData.end).toISOString().slice(0, 19)

      await savePromotion(user.uid, {
        item: formData.item,
        offer: formData.offer || `${((Number.parseFloat(formData.multiplier) - 1) * 100).toFixed(0)}% Off`,
        start: startISO,
        end: endISO,
        multiplier: Number.parseFloat(formData.multiplier),
        channel: formData.channel,
        confidence: 1.0, // Manual entry = 100% confidence
        rating_0to10: 5,
        status: "active",
        metrics: {
          expectedLiftPct: 0,
          baselineUnitsEstimate: null,
          promoUnitsEstimate: null,
        },
      })

      setSuccess(true)
      // Reset form
      setFormData({
        item: "All items",
        offer: "",
        start: "",
        end: "",
        multiplier: "1.15",
        channel: "both",
      })

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || "Failed to create promotion")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Promotion Manually
        </CardTitle>
        <CardDescription>Add a new promotional campaign with custom parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Select value={formData.item} onValueChange={(val) => setFormData({ ...formData, item: val })}>
                <SelectTrigger id="item">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All items">All items</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={(val: "online" | "instore" | "both") => setFormData({ ...formData, channel: val })}
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (Online & In-Store)</SelectItem>
                  <SelectItem value="online">Online Only</SelectItem>
                  <SelectItem value="instore">In-Store Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Start Date & Time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">End Date & Time</Label>
              <Input
                id="end"
                type="datetime-local"
                value={formData.end}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">Multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                {Number.parseFloat(formData.multiplier) > 1
                  ? `+${((Number.parseFloat(formData.multiplier) - 1) * 100).toFixed(0)}% increase`
                  : `${((1 - Number.parseFloat(formData.multiplier)) * 100).toFixed(0)}% decrease`}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="offer">Offer Description</Label>
              <Textarea
                id="offer"
                placeholder="e.g., 15% Off All Items, Buy One Get One Free..."
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-primary bg-primary/10">
              <AlertDescription className="text-primary">Promotion created successfully!</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading} className="w-full gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Promotion
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
