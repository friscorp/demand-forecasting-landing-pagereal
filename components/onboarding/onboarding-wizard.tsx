"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useOnboarding } from "@/lib/onboarding-context"

import StepBusinessDetails from "./steps/step-business-details"
import StepHours from "./steps/step-hours"
import StepLeadTime from "./steps/step-lead-time"
import StepUploadCSV from "./steps/step-upload-csv"
import StepEvents from "./steps/step-events"
import StepRecipes from "./steps/step-recipes"
import StepGenerate from "./steps/step-generate"

const STEPS = [
  { id: 1, title: "Business Details", component: StepBusinessDetails },
  { id: 2, title: "Hours & Closed Days", component: StepHours },
  { id: 3, title: "Lead Time", component: StepLeadTime },
  { id: 4, title: "Upload Data", component: StepUploadCSV },
  { id: 5, title: "Events Calendar", component: StepEvents },
  { id: 6, title: "Recipe Mapping", component: StepRecipes, optional: true },
  { id: 7, title: "Generate Forecast", component: StepGenerate },
]

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepValid, setStepValid] = useState(false)
  const { data } = useOnboarding()
  const router = useRouter()

  const progress = ((currentStep + 1) / STEPS.length) * 100
  const CurrentStepComponent = STEPS[currentStep].component
  const isLastStep = currentStep === STEPS.length - 1
  const isOptionalStep = STEPS[currentStep].optional

  const handleNext = () => {
    if (isLastStep) {
      router.push("/dashboard")
    } else {
      setCurrentStep((prev) => prev + 1)
      setStepValid(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setStepValid(true)
    }
  }

  const handleSkip = () => {
    if (isOptionalStep && !isLastStep) {
      setCurrentStep((prev) => prev + 1)
      setStepValid(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-2">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Business Name Display */}
      {data.business.name && (
        <p className="mb-6 text-sm text-muted-foreground">
          Setting up: <span className="font-medium text-foreground">{data.business.name}</span>
        </p>
      )}

      {/* Step Title */}
      <h1 className="mb-2 text-3xl font-bold text-secondary">{STEPS[currentStep].title}</h1>
      {isOptionalStep && (
        <p className="mb-6 text-sm text-muted-foreground">This step is optional. You can skip it for now.</p>
      )}

      {/* Step Content */}
      <div className="mb-8">
        <CurrentStepComponent onValidChange={setStepValid} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0} className="gap-2 bg-transparent">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {isOptionalStep && !isLastStep && (
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
        )}

        <Button onClick={handleNext} disabled={!stepValid && !isOptionalStep} className="gap-2">
          {isLastStep ? "Go to Dashboard" : "Continue"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
