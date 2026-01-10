"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Calendar, Gift, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useOnboarding, type CalendarEvent } from "@/lib/onboarding-context"

const EVENT_TYPES = [
  {
    value: "holiday",
    label: "Holiday",
    description: "National or local holidays",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: "promo",
    label: "Promotion",
    description: "Sales, discounts, campaigns",
    icon: <Gift className="h-5 w-5" />,
  },
  { value: "closure", label: "Closure", description: "Planned closures", icon: <XCircle className="h-5 w-5" /> },
]

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepEvents({ onValidChange }: StepProps) {
  const { data, addEvent, removeEvent } = useOnboarding()
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: undefined,
    label: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    // Events are optional, so always valid
    onValidChange(true)
  }, [onValidChange])

  const handleAddEvent = () => {
    if (newEvent.type && newEvent.label && newEvent.startDate && newEvent.endDate) {
      addEvent(newEvent as CalendarEvent)
      setNewEvent({ type: undefined, label: "", startDate: "", endDate: "" })
    }
  }

  const isFormComplete = newEvent.type && newEvent.label && newEvent.startDate && newEvent.endDate

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Add holidays, promotions, and closures to improve forecast accuracy.</p>

      {/* Add New Event */}
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <Label className="text-base font-medium">Add Event</Label>

        <div className="grid gap-3 sm:grid-cols-3">
          {EVENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setNewEvent({ ...newEvent, type: type.value as CalendarEvent["type"] })}
              className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                newEvent.type === type.value ? "border-primary bg-accent/30" : "border-border hover:border-primary/50"
              }`}
            >
              <div className={newEvent.type === type.value ? "text-primary" : "text-muted-foreground"}>{type.icon}</div>
              <span
                className={`text-sm font-medium ${newEvent.type === type.value ? "text-primary" : "text-secondary"}`}
              >
                {type.label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Input
              placeholder="e.g., Christmas"
              value={newEvent.label}
              onChange={(e) => setNewEvent({ ...newEvent, label: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              value={newEvent.startDate}
              onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <Input
              type="date"
              value={newEvent.endDate}
              onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
            />
          </div>
        </div>

        <Button type="button" onClick={handleAddEvent} disabled={!isFormComplete} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Event List */}
      {data.events.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Added Events ({data.events.length})</Label>
          {data.events.map((event, index) => (
            <div key={index} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {event.type === "holiday" && <Calendar className="h-4 w-4" />}
                  {event.type === "promo" && <Gift className="h-4 w-4" />}
                  {event.type === "closure" && <XCircle className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-secondary">{event.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
