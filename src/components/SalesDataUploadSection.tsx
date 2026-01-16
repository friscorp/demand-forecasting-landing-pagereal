"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { ingestCsv, forecastFromDb, saveRun, forecastHourly, saveRunHourly } from "@/lib/api"
import { getLatestDailyRun, getLatestHourlyRun } from "@/lib/runs"
import { loadOrComputeHourMask } from "@/lib/hour-mask"
import { doc, getDoc } from "firebase/firestore"

interface UploadDoc {
  id: string
  fileName?: string
  fileSize?: number
  createdAt: any
  csvText: string
  mapping?: any
}

export function SalesDataUploadSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [latestUpload, setLatestUpload] = useState<UploadDoc | null>(null)
  const [isLoadingUpload, setIsLoadingUpload] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showFileSizeWarning, setShowFileSizeWarning] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsLoadingUpload(false)
      return
    }

    const loadLatestUpload = async () => {
      try {
        const uploadsRef = collection(db, "users", user.uid, "uploads")
        let q = query(uploadsRef, orderBy("lastUsedAt", "desc"), limit(1))

        let snapshot = await getDocs(q)

        // Fallback to createdAt if no lastUsedAt
        if (snapshot.empty) {
          q = query(uploadsRef, orderBy("createdAt", "desc"), limit(1))
          snapshot = await getDocs(q)
        }

        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          setLatestUpload({
            id: doc.id,
            ...doc.data(),
          } as UploadDoc)
        }
      } catch (error) {
        console.error("error loading latest upload:", error)
      } finally {
        setIsLoadingUpload(false)
      }
    }

    loadLatestUpload()
  }, [user])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setUploadError("Please select a valid CSV file")
      return
    }

    // Check file size (warning at 500KB)
    if (file.size > 500 * 1024) {
      setShowFileSizeWarning(true)
    } else {
      setShowFileSizeWarning(false)
    }

    setUploadFile(file)
    setUploadError(null)
    setUploadSuccess(false)
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return

    // If file is too large (> 1MB), block upload
    if (uploadFile.size > 1024 * 1024) {
      setUploadError("File too large (max 1MB). Please upload a smaller export.")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const csvText = await uploadFile.text()

      // Create new upload document
      const uploadsRef = collection(db, "users", user.uid, "uploads")
      await addDoc(uploadsRef, {
        uid: user.uid,
        csvText,
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
        status: "UPLOADED",
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
      })

      setUploadSuccess(true)
      setUploadFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Reload latest upload
      const q = query(uploadsRef, orderBy("lastUsedAt", "desc"), limit(1))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        setLatestUpload({
          id: doc.id,
          ...doc.data(),
        } as UploadDoc)
      }
    } catch (error) {
      console.error("upload failed:", error)
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerateForecast = async () => {
    if (!user) return

    setIsGenerating(true)
    setGenerateError(null)

    try {
      // Step 1: Ingest the latest CSV
      if (!latestUpload?.csvText) {
        throw new Error("No CSV data available")
      }

      const mapping = latestUpload.mapping || {
        date: "timestamp",
        item: "product",
        quantity: "units_sold",
      }

      await ingestCsv({
        csvText: latestUpload.csvText,
        mapping,
        businessName: "Business",
      })

      // Step 2: Generate daily forecast
      const dailyForecast = await forecastFromDb({ horizonDays: 7 })

      if (!dailyForecast || !dailyForecast.results) {
        throw new Error("Invalid forecast response")
      }

      // Step 3: Save daily forecast
      await saveRun({
        businessName: "Business",
        mapping,
        forecast: dailyForecast,
        insights: null,
      })

      await getLatestDailyRun(user.uid)

      // Step 4: Generate hourly forecast
      try {
        // Fetch business profile to get hours and timezone
        let hourMask = null
        let businessHours = null
        let timezone = undefined

        try {
          const profileDoc = await getDoc(doc(db, "businesses", user.uid))
          if (profileDoc.exists()) {
            const profile = profileDoc.data()
            businessHours = profile.hours
            timezone = profile.timezone
          }

          if (businessHours) {
            hourMask = await loadOrComputeHourMask(user.uid, businessHours, timezone)
          }
        } catch (maskError) {
          console.error("Failed to load hour mask (non-blocking):", maskError)
        }

        // Include hourMask in the hourly forecast request
        const hourlyForecast = await forecastHourly({
          horizonDays: 7,
          hourMask: hourMask || undefined,
        })

        // Step 5: Save hourly forecast
        await saveRunHourly({
          businessName: "Business",
          mapping,
          forecast: hourlyForecast,
          insights: null,
        })

        await getLatestHourlyRun(user.uid)
      } catch (hourlyError) {
        console.error("hourly forecast failed (non-blocking):", hourlyError)
      }

      // Navigate back to dashboard
      navigate("/dashboard")
    } catch (error) {
      console.error("forecast generation failed:", error)
      setGenerateError(error instanceof Error ? error.message : "Failed to generate forecast")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please sign in to manage your sales data</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card id="sales-data">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Sales Data
        </CardTitle>
        <CardDescription>Upload a new CSV to replace your current dataset</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingUpload ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading current dataset...
          </div>
        ) : latestUpload ? (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Current dataset</p>
                <p className="text-xs text-muted-foreground">
                  {latestUpload.fileName || "Uploaded CSV"} •{" "}
                  {latestUpload.createdAt?.toDate?.()?.toLocaleDateString?.() || "Unknown date"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No data uploaded yet</AlertDescription>
          </Alert>
        )}

        {showFileSizeWarning && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This file may be too large to store in Firestore. Please upload a smaller export or we will migrate to
              Storage later.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
              disabled={isUploading || isGenerating}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isGenerating}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadFile ? uploadFile.name : "Choose CSV file"}
            </Button>
          </div>

          {uploadFile && (
            <Button onClick={handleUpload} disabled={isUploading || isGenerating} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload new CSV
                </>
              )}
            </Button>
          )}
        </div>

        {uploadSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Upload saved successfully! Click below to generate new forecasts.
            </AlertDescription>
          </Alert>
        )}

        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {uploadSuccess && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Your new data is ready. Generate updated forecasts to see the latest predictions.
            </p>
            <Button onClick={handleGenerateForecast} disabled={isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating forecasts...
                </>
              ) : (
                "Generate New Forecast"
              )}
            </Button>

            {generateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generateError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
