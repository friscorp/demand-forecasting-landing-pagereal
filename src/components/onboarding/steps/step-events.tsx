"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"

export function StepEvents() {
  const { data, updateData } = useOnboarding()
  const [newEvent, setNewEvent] = useState({
    date: undefined as Date | undefined,
    type: "holiday" as const,
    description: "",
  })

  const addEvent = () => {
    if (newEvent.date && newEvent.description) {
      const year = newEvent.date.getFullYear()
      const month = String(newEvent.date.getMonth() + 1).padStart(2, "0")
      const day = String(newEvent.date.getDate()).padStart(2, "0")
      const dateStr = `${year}-${month}-${day}`

      updateData({
        events: [
          ...data.events,
          {
            date: dateStr,
            type: newEvent.type,
            description: newEvent.description,
          },
        ],
      })
      setNewEvent({
        date: undefined,
        type: "holiday",
        description: "",
      })
    }
  }

  const removeEvent = (index: number) => {
    updateData({
      events: data.events.filter((_, i) => i !== index),
    })
  }

  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">Add important dates that might affect demand (holidays)</p>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <CalendarIcon className="h-4 w-4" />
                  {newEvent.date ? format(newEvent.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newEvent.date}
                  onSelect={(date) => setNewEvent({ ...newEvent, date })}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Holiday Name</Label>
          <Input
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            placeholder="e.g., Christmas Day, New Year's Day"
          />
        </div>

        <Button onClick={addEvent} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {data.events.length > 0 && (
        <div className="space-y-2">
          <Label>Added Holidays</Label>
          <div className="space-y-2">
            {data.events.map((event, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div>
                  <p className="font-medium text-secondary">{event.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseDate(event.date), "MMM dd, yyyy")} • <span className="capitalize">{event.type}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEvent(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
