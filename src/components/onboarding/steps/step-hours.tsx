"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, X } from "lucide-react"
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

      <div>
        <Label className="mb-4 block">Additional Closed Dates</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
            </PopoverContent>
          </Popover>
          <Button onClick={addClosedDate} disabled={!selectedDate}>
            Add Date
          </Button>
        </div>
        {data.closedDates.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.closedDates.map((date) => (
              <div key={date} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                {format(new Date(date), "MMM dd, yyyy")}
                <button onClick={() => removeClosedDate(date)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
