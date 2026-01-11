"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Card } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export function StepGenerateForecast() {
  const { data } = useOnboarding()

  const completedSteps = [
    { label: "Business details configured", done: !!data.category },
    { label: "Operating hours set", done: Object.keys(data.hours).length > 0 },
    { label: "Lead time defined", done: !!data.leadTime },
    { label: "Historical data uploaded", done: !!data.csvFile },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-secondary">You're all set!</h2>
        <p className="text-muted-foreground">Review your settings below, then click "Generate Forecast" to continue</p>
      </div>

      <Card className="space-y-4 p-6">
        {completedSteps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${step.done ? "text-primary" : "text-muted-foreground"}`} />
            <span className={step.done ? "text-secondary" : "text-muted-foreground"}>{step.label}</span>
          </div>
        ))}
      </Card>

      <div className="rounded-xl bg-primary/10 p-6 text-center">
        <h3 className="mb-2 font-semibold text-secondary">Ready to forecast for {data.businessName}</h3>
        <p className="text-sm text-muted-foreground">
          Click "Generate Forecast" below to analyze your data and get accurate demand predictions
        </p>
      </div>
    </div>
  )
}
