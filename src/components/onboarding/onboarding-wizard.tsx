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
import { ingestCsv, forecastFromDb, saveRun, saveBusinessProfile } from "@/lib/api"
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
  const { currentStep, setCurrentStep, data, resetOnboarding } = useOnboarding()
  const { user, loading: authLoading } = useAuth()
  const { setForecast } = useForecast()
  const navigate = useNavigate()
  const CurrentStepComponent = steps[currentStep].component

  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null)
  const [ingestMeta, setIngestMeta] = useState<{ businessId?: string; fileHash: string; rowsInserted: number } | null>(
    null,
  )
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState<string>("")
  const [pendingAction, setPendingAction] = useState<"ingest" | "forecast" | null>(null)

  const [isForecastingDB, setIsForecastingDB] = useState(false)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [lastForecastResponse, setLastForecastResponse] = useState<any | null>(null)
  const [isRetryingSave, setIsRetryingSave] = useState(false)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null)

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
      const csvText = await data.csvFile.text()

      const mapping = {
        date: data.csvColumns.date,
        item: data.csvColumns.item,
        quantity: data.csvColumns.quantity,
      }

      const response = await ingestCsv({
        csvText,
        mapping,
        businessName: data.businessName || "My Business",
      })

      setIngestMeta({
        businessId: response.businessId,
        fileHash: response.fileHash,
        rowsInserted: response.rowsInserted,
      })

      if (response.rowsInserted > 0) {
        setIngestSuccess(`Successfully ingested ${response.rowsInserted} rows`)
      } else if (response.deduped) {
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
    setProfileSaveError(null)
    setProfileSaveSuccess(null)

    try {
      const forecastResponse = await forecastFromDb({ horizonDays: 7 })
      console.log("[v0] Raw forecast response from callable:", forecastResponse)

      if (!forecastResponse || !forecastResponse.results) {
        console.error("[v0] Invalid forecast response - missing .results field:", forecastResponse)
        setForecastError("Forecast generation failed (invalid response). Expected {mode, results}.")
        setIsForecastingDB(false)
        return
      }

      console.log("[v0] Forecast validation passed. Results items:", Object.keys(forecastResponse.results))
      setLastForecastResponse(forecastResponse)
      setForecast(forecastResponse)

      try {
        const mapping = data.csvColumns
          ? {
              date: data.csvColumns.date,
              item: data.csvColumns.item,
              quantity: data.csvColumns.quantity,
            }
          : {}

        const runResponse = await saveRun({
          businessName: data.businessName || "My Business",
          mapping,
          forecast: forecastResponse,
          insights: null,
        })

        console.log("[v0] saveRun success:", runResponse)

        setIsSavingProfile(true)
        try {
          await saveBusinessProfile({
            profile: {
              name: data.businessName || "My Business",
              industry: data.category || "",
              location: data.location || "",
              timezone: data.timezone || "",
              unitOfMeasure: data.unitOfMeasure || "",
              hours: data.hours,
              closedDates: data.closedDates,
              leadTime: data.leadTime || "",
              customLeadTime: data.customLeadTime,
              events: data.events,
              recipeMapping: data.recipeMapping,
            },
          })
          console.log("[v0] Business profile saved successfully")
          setProfileSaveSuccess("Business setup saved")
        } catch (profileError) {
          console.error("[v0] Failed to save business profile:", profileError)
          setProfileSaveError("Couldn't save business setup. Please try again.")
          setIsSavingProfile(false)
          setIsForecastingDB(false)
          return
        } finally {
          setIsSavingProfile(false)
        }

        resetOnboarding()

        navigate("/dashboard")
      } catch (saveError) {
        console.error("[v0] saveRun failed:", saveError)
        setForecastError("Could not sync forecast. Retry?")
        setIsForecastingDB(false)
        return
      }
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
      const mapping = data.csvColumns
        ? {
            date: data.csvColumns.date,
            item: data.csvColumns.item,
            quantity: data.csvColumns.quantity,
          }
        : {}

      const runResponse = await saveRun({
        businessName: data.businessName || "My Business",
        mapping,
        forecast: lastForecastResponse,
        insights: null,
      })

      console.log("[v0] saveRun (retry) success:", runResponse)
      resetOnboarding()
      navigate("/dashboard")
    } catch (error) {
      console.error("[v0] Retry save failed:", error)
      setForecastError("Could not sync. Please try again.")
    } finally {
      setIsRetryingSave(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 3) {
      if (authLoading) return

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
      if (authLoading) return

      if (!user) {
        setAuthModalMessage("Please sign in or create an account to generate your forecast.")
        setPendingAction("forecast")
        setShowAuthModal(true)
        return
      }

      await performForecast()
      return
    }

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
      setProfileSaveError(null)
      setProfileSaveSuccess(null)
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

      {currentStep === 6 && profileSaveSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {profileSaveSuccess}
        </div>
      )}

      {currentStep === 6 && profileSaveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {profileSaveError}
        </div>
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
          disabled={currentStep === 0 || isIngesting || isForecastingDB || isSavingProfile}
          className="gap-2 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={isIngesting || isForecastingDB || authLoading || isSavingProfile}
          className="gap-2"
        >
          {isIngesting
            ? "Uploading..."
            : isForecastingDB
              ? "Generating..."
              : isSavingProfile
                ? "Saving..."
                : authLoading
                  ? "Loading..."
                  : currentStep === steps.length - 1
                    ? "Generate Forecast"
                    : "Continue"}
          {!isIngesting && !isForecastingDB && !authLoading && !isSavingProfile && <ChevronRight className="h-4 w-4" />}
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
