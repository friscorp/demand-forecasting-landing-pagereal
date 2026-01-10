"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useOnboarding } from "@/lib/onboarding-context"

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepHours({ onValidChange }: StepProps) {
  const { data, updateHours } = useOnboarding()
  const [newClosedDate, setNewClosedDate] = useState("")

  useEffect(() => {
    // At least one day should be open
    const hasOpenDay = DAYS.some((day) => !data.hours.weekly[day].closed)
    onValidChange(hasOpenDay)
  }, [data.hours, onValidChange])

  const updateDayHours = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    updateHours({
      weekly: {
        ...data.hours.weekly,
        [day]: { ...data.hours.weekly[day], [field]: value },
      },
    })
  }

  const addClosedDate = () => {
    if (newClosedDate) {
      updateHours({
        closedDates: [...data.hours.closedDates, { date: newClosedDate, recurring: false }],
      })
      setNewClosedDate("")
    }
  }

  const removeClosedDate = (index: number) => {
    updateHours({
      closedDates: data.hours.closedDates.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Set your regular operating hours and any closed dates.</p>

      {/* Weekly Hours */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Weekly Hours</Label>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-4 rounded-lg border bg-card p-3">
              <span className="w-24 font-medium capitalize text-secondary">{day}</span>
              <Switch
                checked={!data.hours.weekly[day].closed}
                onCheckedChange={(checked) => updateDayHours(day, "closed", !checked)}
              />
              {!data.hours.weekly[day].closed ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={data.hours.weekly[day].open}
                    onChange={(e) => updateDayHours(day, "open", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={data.hours.weekly[day].close}
                    onChange={(e) => updateDayHours(day, "close", e.target.value)}
                    className="w-32"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Closed Dates */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Additional Closed Dates</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
            className="flex-1"
          />
          <Button type="button" onClick={addClosedDate} variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {data.hours.closedDates.length > 0 && (
          <div className="space-y-2">
            {data.hours.closedDates.map((cd, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <span>{new Date(cd.date).toLocaleDateString()}</span>
                <Button type="button" onClick={() => removeClosedDate(index)} variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
