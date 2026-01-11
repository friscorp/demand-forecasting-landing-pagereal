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
  const { user, loading: authLoading } = useAuth()
  const { setForecast } = useForecast()
  const navigate = useNavigate()
  const CurrentStepComponent = steps[currentStep].component

  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState<string>("")
  const [pendingAction, setPendingAction] = useState<"ingest" | "forecast" | null>(null)

  const [isForecastingDB, setIsForecastingDB] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [lastForecastResponse, setLastForecastResponse] = useState<any | null>(null)
  const [isRetryingSave, setIsRetryingSave] = useState(false)

  const handleAuthSuccess = () => {
    if (pendingAction === "ingest") {
      performIngest()
    } else if (pendingAction === "forecast") {
      performForecast()
    }
    setPendingAction(null)
  }

  const performIngest = async () => {
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
  }

  const performForecast = async () => {
    setIsForecastingDB(true)
    setForecastError(null)

    try {
      const forecastResponse = await generateForecastFromDB(7)
      console.log("[v0] Raw forecast response from API:", forecastResponse)
      console.log("[v0] Forecast response type:", typeof forecastResponse)
      console.log("[v0] Forecast response keys:", forecastResponse ? Object.keys(forecastResponse) : null)

      if (!forecastResponse || !forecastResponse.results) {
        console.error("[v0] Invalid forecast response - missing .results field:", forecastResponse)
        setForecastError("Forecast generation failed (invalid response). Expected {mode, results}.")
        setIsForecastingDB(false)
        return
      }

      console.log("[v0] ✓ Forecast validation passed. Results items:", Object.keys(forecastResponse.results))
      setLastForecastResponse(forecastResponse)

      localStorage.setItem("dn_forecast_json", JSON.stringify(forecastResponse))
      setForecast(forecastResponse)

      try {
        const mappingJson = JSON.parse(localStorage.getItem("dn_mapping_json") || "{}")

        const runPayload = {
          business_name: data.businessName || "My Business",
          mapping_json: mappingJson,
          forecast_json: forecastResponse,
          insights_json: null,
        }

        console.log("[v0] About to POST /runs with payload:")
        console.log("[v0]   business_name:", runPayload.business_name)
        console.log("[v0]   mapping_json:", runPayload.mapping_json)
        console.log("[v0]   forecast_json type:", typeof runPayload.forecast_json)
        console.log("[v0]   forecast_json.mode:", runPayload.forecast_json?.mode)
        console.log(
          "[v0]   forecast_json.results keys:",
          runPayload.forecast_json?.results ? Object.keys(runPayload.forecast_json.results) : null,
        )

        const runResponse = await saveRun(runPayload)

        console.log("[v0] POST /runs success:", runResponse)
        console.log(
          "[v0] Saved run forecast_json.results:",
          runResponse.forecast_json?.results ? Object.keys(runResponse.forecast_json.results) : null,
        )

        const normalizedRun = {
          id: runResponse.id,
          business_name: runResponse.business_name,
          mapping_json: runResponse.mapping_json,
          forecast_json: runResponse.forecast_json,
          insights_json: runResponse.insights_json,
          created_at: runResponse.created_at,
        }

        localStorage.setItem("dn_latest_run_id", String(normalizedRun.id))
        localStorage.setItem("dn_latest_run", JSON.stringify(normalizedRun))

        localStorage.removeItem("onboarding-step")
        localStorage.removeItem("onboarding-data")

        navigate("/dashboard")
      } catch (saveError) {
        console.error("[v0] POST /runs failed:", saveError)
        if (saveError instanceof Error) {
          console.error("[v0] Error message:", saveError.message)
        }
        setForecastError("Could not sync forecast. Retry?")
        setIsForecastingDB(false)
        return
      }

      navigate("/dashboard")
    } catch (error) {
      console.error("[v0] Forecast error:", error)
      setForecastError(error instanceof Error ? error.message : "Failed to generate forecast. Please try again.")
    } finally {
      setIsForecastingDB(false)
    }
  }

  const handleRetrySave = async () => {
    if (!lastForecastResponse) return

    if (!lastForecastResponse.results) {
      console.error("[v0] Cannot retry save - forecast missing .results:", lastForecastResponse)
      setForecastError("Cannot save - invalid forecast data")
      return
    }

    setIsRetryingSave(true)
    setForecastError(null)

    try {
      const mappingJson = JSON.parse(localStorage.getItem("dn_mapping_json") || "{}")

      console.log("[v0] Retry: About to POST /runs with forecast.results:", Object.keys(lastForecastResponse.results))

      const runResponse = await saveRun({
        business_name: data.businessName || "My Business",
        mapping_json: mappingJson,
        forecast_json: lastForecastResponse,
        insights_json: null,
      })

      console.log("[v0] Saved run (retry):", runResponse)

      const normalizedRun = {
        id: runResponse.id,
        business_name: runResponse.business_name,
        mapping_json: runResponse.mapping_json,
        forecast_json: runResponse.forecast_json,
        insights_json: runResponse.insights_json,
        created_at: runResponse.created_at,
      }

      localStorage.setItem("dn_latest_run_id", String(normalizedRun.id))
      localStorage.setItem("dn_latest_run", JSON.stringify(normalizedRun))

      localStorage.removeItem("onboarding-step")
      localStorage.removeItem("onboarding-data")

      navigate("/dashboard")
    } catch (error) {
      console.error("[v0] Retry save failed:", error)
      if (error instanceof Error) {
        console.error("[v0] Error message:", error.message)
      }
      setForecastError("Could not sync—data saved locally. Please try again.")
    } finally {
      setIsRetryingSave(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 3) {
      if (authLoading) {
        return
      }

      if (!user) {
        setAuthModalMessage("Please sign in or create an account to upload your data and continue.")
        setPendingAction("ingest")
        setShowAuthModal(true)
        return
      }

      await performIngest()
      return
    }

    if (currentStep === 6) {
      if (authLoading) {
        return
      }

      if (!user) {
        setAuthModalMessage("Please sign in or create an account to generate your forecast.")
        setPendingAction("forecast")
        setShowAuthModal(true)
        return
      }

      await performForecast()
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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm text-red-800">{forecastError}</p>
          {forecastError.includes("Could not sync") && (
            <Button
              onClick={handleRetrySave}
              disabled={isRetryingSave}
              size="sm"
              variant="outline"
              className="bg-white"
            >
              {isRetryingSave ? "Retrying..." : "Retry Sync"}
            </Button>
          )}
        </div>
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
        <Button onClick={handleNext} disabled={isIngesting || isForecastingDB || authLoading} className="gap-2">
          {isIngesting
            ? "Uploading..."
            : isForecastingDB
              ? "Generating..."
              : authLoading
                ? "Loading..."
                : currentStep === steps.length - 1
                  ? "Generate Forecast"
                  : "Continue"}
          {!isIngesting && !isForecastingDB && !authLoading && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {showAuthModal && (
        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          onAuthSuccess={handleAuthSuccess}
          message={authModalMessage}
        />
      )}
    </div>
  )
}
