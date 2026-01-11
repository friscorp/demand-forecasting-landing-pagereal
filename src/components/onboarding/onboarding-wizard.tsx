"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { useAuth } from "@/lib/auth-context"
import { useForecast } from "@/lib/forecast-context"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StepBusinessDetails } from "./steps/step-business-details"
import { StepHours } from "./steps/step-hours"
import { StepLeadTime } from "./steps/step-lead-time"
import { StepUploadCSV } from "./steps/step-upload-csv"
import { StepEvents } from "./steps/step-events"
import { StepRecipeMapping } from "./steps/step-recipe-mapping"
import { StepGenerateForecast } from "./steps/step-generate-forecast"
import { ingestCSV, generateForecastFromDB, saveRun } from "@/lib/api-client"
import { useState } from "react"
import { AuthModal } from "@/components/auth-modal"
import { useNavigate } from "react-router-dom"

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
  const { user } = useAuth()
  const { setForecast } = useForecast()
  const navigate = useNavigate()
  const CurrentStepComponent = steps[currentStep].component

  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [isForecastingDB, setIsForecastingDB] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)

  const handleNext = async () => {
    if (currentStep === 3) {
      if (!user) {
        setShowAuthModal(true)
        return
      }

      if (!data.csvFile) {
        setIngestError("Please upload a CSV file")
        return
      }

      if (!data.csvColumns?.date || !data.csvColumns?.item || !data.csvColumns?.quantity) {
        setIngestError("Please map all required columns (date, item, quantity)")
        return
      }

      setIsIngesting(true)
      setIngestError(null)
      setIngestSuccess(null)

      try {
        const mapping = {
          date: data.csvColumns.date,
          item: data.csvColumns.item,
          quantity: data.csvColumns.quantity,
        }

        const response = await ingestCSV(data.csvFile, mapping)

        localStorage.setItem("dn_mapping_json", JSON.stringify(mapping))
        localStorage.setItem(
          "dn_ingest_meta",
          JSON.stringify({
            business_id: response.business_id,
            file_hash: response.file_hash,
            rows_inserted: response.rows_inserted,
            deduped: response.upload_id === null,
          }),
        )

        if (response.rows_inserted > 0) {
          setIngestSuccess(`Successfully ingested ${response.rows_inserted} rows`)
        } else if (response.upload_id === null) {
          setIngestSuccess("Already uploaded; using existing data")
        }

        setTimeout(() => {
          setCurrentStep(currentStep + 1)
          setIngestSuccess(null)
        }, 1500)
      } catch (error) {
        setIngestError(error instanceof Error ? error.message : "Failed to ingest CSV. Please try again.")
      } finally {
        setIsIngesting(false)
      }

      return
    }

    if (currentStep === 6) {
      if (!user) {
        setShowAuthModal(true)
        return
      }

      setIsForecastingDB(true)
      setForecastError(null)

      try {
        // Phase 3: Generate forecast from DB
        const forecastResponse = await generateForecastFromDB(7)
        console.log("[v0] Forecast from DB:", forecastResponse)

        // Store in localStorage
        localStorage.setItem("dn_forecast_json", JSON.stringify(forecastResponse))

        // Store in context
        setForecast(forecastResponse)

        try {
          const mappingJson = JSON.parse(localStorage.getItem("dn_mapping_json") || "{}")

          const runResponse = await saveRun({
            business_name: data.businessName || "My Business",
            mapping_json: mappingJson,
            forecast_json: forecastResponse,
            insights_json: null,
          })

          console.log("[v0] Saved run:", runResponse)

          // Store both run ID and full run object
          localStorage.setItem("dn_latest_run_id", String(runResponse.id))
          localStorage.setItem("dn_latest_run", JSON.stringify(runResponse))
        } catch (saveError) {
          console.error("[v0] Failed to save run:", saveError)
          setForecastError("Could not sync to database—data saved locally. You can retry later.")
          // Don't block navigation if save fails
        }

        // Navigate to dashboard
        navigate("/dashboard")
      } catch (error) {
        console.error("[v0] Forecast error:", error)
        setForecastError(error instanceof Error ? error.message : "Failed to generate forecast. Please try again.")
      } finally {
        setIsForecastingDB(false)
      }

      return
    }

    // Normal navigation for other steps
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setIngestError(null)
      setIngestSuccess(null)
      setForecastError(null)
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

      {currentStep === 3 && (
        <>
          {ingestError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {ingestError}
            </div>
          )}
          {ingestSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {ingestSuccess}
            </div>
          )}
        </>
      )}

      {currentStep === 6 && forecastError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{forecastError}</div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isIngesting || isForecastingDB}
          className="gap-2 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isIngesting || isForecastingDB} className="gap-2">
          {isIngesting
            ? "Uploading..."
            : isForecastingDB
              ? "Generating..."
              : currentStep === steps.length - 1
                ? "Generate Forecast"
                : "Continue"}
          {!isIngesting && !isForecastingDB && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
