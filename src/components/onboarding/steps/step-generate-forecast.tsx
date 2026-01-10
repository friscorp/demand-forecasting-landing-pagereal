"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { useForecast } from "@/lib/forecast-context"
import { generateForecast } from "@/lib/forecast-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export function StepGenerateForecast() {
  const { data } = useOnboarding()
  const { setForecast, setSelectedItem } = useForecast()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    if (!data.csvFile || !data.csvColumns) {
      toast({
        title: "Missing data",
        description: "Please upload a CSV file and map the columns first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await generateForecast({
        file: data.csvFile,
        mapping: {
          date: data.csvColumns.date,
          item: data.csvColumns.item,
          quantity: data.csvColumns.quantity,
        },
        horizon_days: 7,
      })

      setForecast(result)

      // Set first item as selected
      const items = Object.keys(result)
      if (items.length > 0) {
        setSelectedItem(items[0])
      }

      toast({
        title: "Forecast generated!",
        description: "Your demand forecast is ready to view",
      })

      navigate("/dashboard")
    } catch (error) {
      console.error("Forecast generation error:", error)
      toast({
        title: "Error generating forecast",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
        <Button onClick={handleGenerate} size="lg" className="gap-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating Forecast...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Forecast
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
