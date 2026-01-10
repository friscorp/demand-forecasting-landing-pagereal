"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StepBusinessDetails } from "./steps/step-business-details"
import { StepHours } from "./steps/step-hours"
import { StepLeadTime } from "./steps/step-lead-time"
import { StepUploadCSV } from "./steps/step-upload-csv"
import { StepEvents } from "./steps/step-events"
import { StepRecipeMapping } from "./steps/step-recipe-mapping"
import { StepGenerateForecast } from "./steps/step-generate-forecast"

const steps = [
  { title: "Business Details", component: StepBusinessDetails },
  { title: "Hours & Closed Days", component: StepHours },
  { title: "Lead Time", component: StepLeadTime },
  { title: "Upload CSV", component: StepUploadCSV },
  { title: "Events Calendar", component: StepEvents },
  { title: "Recipe Mapping", component: StepRecipeMapping },
  { title: "Generate Forecast", component: StepGenerateForecast },
]

export function OnboardingWizard() {
  const { currentStep, setCurrentStep, data } = useOnboarding()
  const CurrentStepComponent = steps[currentStep].component

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </h2>
          <p className="text-sm font-medium text-primary">{data.businessName}</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Title */}
      <h1 className="mb-8 text-3xl font-bold text-secondary">{steps[currentStep].title}</h1>

      {/* Step Content */}
      <div className="mb-8">
        <CurrentStepComponent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0} className="gap-2 bg-transparent">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="gap-2">
          {currentStep === steps.length - 1 ? "Finish" : "Continue"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
