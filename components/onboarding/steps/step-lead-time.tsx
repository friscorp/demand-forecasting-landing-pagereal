"use client"

import { useEffect } from "react"
import { Clock, Zap, Timer, Settings } from "lucide-react"
import OptionCard from "../option-card"
import { useOnboarding } from "@/lib/onboarding-context"

const LEAD_TIMES = [
  {
    value: "same-day",
    label: "Same Day",
    description: "Forecast for same-day operations",
    icon: <Zap className="h-5 w-5" />,
  },
  { value: "24h", label: "24 Hours", description: "One day advance preparation", icon: <Clock className="h-5 w-5" /> },
  { value: "48h", label: "48 Hours", description: "Two days advance preparation", icon: <Timer className="h-5 w-5" /> },
  { value: "custom", label: "Custom", description: "Set your own lead time", icon: <Settings className="h-5 w-5" /> },
]

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepLeadTime({ onValidChange }: StepProps) {
  const { data, updateData } = useOnboarding()

  useEffect(() => {
    onValidChange(!!data.leadTimeTemplate)
  }, [data.leadTimeTemplate, onValidChange])

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">How much advance notice do you need to prepare for forecasted demand?</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {LEAD_TIMES.map((lt) => (
          <OptionCard
            key={lt.value}
            icon={lt.icon}
            title={lt.label}
            description={lt.description}
            selected={data.leadTimeTemplate === lt.value}
            onClick={() => updateData({ leadTimeTemplate: lt.value })}
          />
        ))}
      </div>
    </div>
  )
}
