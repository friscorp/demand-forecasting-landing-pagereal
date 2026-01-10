"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { OptionCard } from "../option-card"
import { Clock, Zap, Calendar, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const leadTimeOptions = [
  {
    id: "same-day",
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: "Same Day",
    description: "Orders fulfilled within the same day",
  },
  {
    id: "24h",
    icon: <Clock className="h-6 w-6 text-primary" />,
    title: "24 Hours",
    description: "Next day fulfillment",
  },
  {
    id: "48h",
    icon: <Calendar className="h-6 w-6 text-primary" />,
    title: "48 Hours",
    description: "Two day fulfillment",
  },
  {
    id: "custom",
    icon: <Settings className="h-6 w-6 text-primary" />,
    title: "Custom",
    description: "Set your own lead time",
  },
]

export function StepLeadTime() {
  const { data, updateData } = useOnboarding()

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">How long does it typically take to fulfill an order?</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {leadTimeOptions.map((option) => (
          <OptionCard
            key={option.id}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={data.leadTime === option.id}
            onClick={() => updateData({ leadTime: option.id })}
          />
        ))}
      </div>

      {data.leadTime === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="custom-lead-time">Lead Time (in hours)</Label>
          <Input
            id="custom-lead-time"
            type="number"
            min="1"
            value={data.customLeadTime ?? ""}
            onChange={(e) => updateData({ customLeadTime: Number.parseInt(e.target.value, 10) })}
            placeholder="Enter hours"
          />
        </div>
      )}
    </div>
  )
}
