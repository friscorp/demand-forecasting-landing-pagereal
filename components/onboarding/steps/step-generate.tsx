"use client"

import { useEffect, useState } from "react"
import { Sparkles, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/lib/onboarding-context"

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepGenerate({ onValidChange }: StepProps) {
  const { data } = useOnboarding()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    onValidChange(isComplete)
  }, [isComplete, onValidChange])

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate forecast generation
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsGenerating(false)
    setIsComplete(true)
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        {isComplete ? (
          <CheckCircle className="h-10 w-10 text-primary" />
        ) : (
          <Sparkles className="h-10 w-10 text-primary" />
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-secondary">
          {isComplete ? "Forecast Ready!" : "Ready to Generate Your Forecast"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isComplete
            ? "Your 7-day demand forecast has been generated. Click Continue to view your dashboard."
            : "We'll analyze your data and create a 7-day demand forecast with AI-powered insights."}
        </p>
      </div>

      {/* Summary */}
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-4 text-left">
        <p className="mb-3 font-medium text-secondary">Summary</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business</span>
            <span className="font-medium text-secondary">{data.business.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium capitalize text-secondary">{data.business.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lead Time</span>
            <span className="font-medium text-secondary">{data.leadTimeTemplate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Events</span>
            <span className="font-medium text-secondary">{data.events.length} added</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipes</span>
            <span className="font-medium text-secondary">{data.recipes.length} mapped</span>
          </div>
        </div>
      </div>

      {!isComplete && (
        <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating Forecast...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Run Forecast
            </>
          )}
        </Button>
      )}
    </div>
  )
}
