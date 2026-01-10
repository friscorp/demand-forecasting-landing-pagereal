"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, CheckCircle2 } from "lucide-react"

export function StepGenerateForecast() {
  const { data } = useOnboarding()

  const handleGenerate = () => {
    console.log("Generating forecast with data:", data)
    // TODO: Implement forecast generation API call
  }

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
        <p className="text-muted-foreground">Review your settings and generate your first demand forecast</p>
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
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 font-semibold text-secondary">Ready to forecast for {data.businessName}</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Our AI will analyze your data and generate accurate demand predictions
        </p>
        <Button onClick={handleGenerate} size="lg" className="gap-2">
          <Sparkles className="h-5 w-5" />
          Generate Forecast
        </Button>
      </div>
    </div>
  )
}
