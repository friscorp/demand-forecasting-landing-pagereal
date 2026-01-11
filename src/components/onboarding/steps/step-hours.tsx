"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { useState } from "react"

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export function StepHours() {
  const { data, updateData } = useOnboarding()
  const [selectedDate, setSelectedDate] = useState<Date>()

  const updateHours = (day: string, field: "open" | "close" | "enabled", value: string | boolean) => {
    updateData({
      hours: {
        ...data.hours,
        [day]: { ...data.hours[day], [field]: value },
      },
    })
  }

  const addClosedDate = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      if (!data.closedDates.includes(dateStr)) {
        updateData({ closedDates: [...data.closedDates, dateStr] })
      }
      setSelectedDate(undefined)
    }
  }

  const removeClosedDate = (date: string) => {
    updateData({
      closedDates: data.closedDates.filter((d) => d !== date),
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-6 text-muted-foreground">Set your weekly business hours</p>
        <div className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-32">
                <Label className="capitalize">{day}</Label>
              </div>
              <Switch
                checked={data.hours[day]?.enabled ?? false}
                onCheckedChange={(checked) => updateHours(day, "enabled", checked)}
              />
              {data.hours[day]?.enabled && (
                <>
                  <Input
                    type="time"
                    value={data.hours[day]?.open ?? "09:00"}
                    onChange={(e) => updateHours(day, "open", e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={data.hours[day]?.close ?? "17:00"}
                    onChange={(e) => updateHours(day, "close", e.target.value)}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          💡 You'll be able to add specific closed dates (holidays, closures) in the Events Calendar on a later step.
        </p>
      </div>
    </div>
  )
}
