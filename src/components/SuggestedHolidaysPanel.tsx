"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, CheckCircle, Sparkles, ExternalLink } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore"

interface Holiday {
  name: string
  date: string
  observedDate: string | null
  category: string
  relevanceNote: string
  source: string
}

interface HolidayResponse {
  region: string
  holidays: Holiday[]
}

async function fetchSuggestedHolidays(region: string, years: number[]): Promise<HolidayResponse> {
  const user = auth.currentUser
  if (!user) throw new Error("Not authenticated")

  const token = await user.getIdToken()

  const response = await fetch("https://us-central1-business-forecast-ea3a5.cloudfunctions.net/suggestHolidaysHttp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ region, years }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export function SuggestedHolidaysPanel() {
  const navigate = useNavigate()
  const [region, setRegion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadRegion() {
      const user = auth.currentUser
      if (!user) return

      try {
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))
        if (profileDoc.exists()) {
          const data = profileDoc.data()
          setRegion(data.location || data.region || null)
        }
      } catch (err) {
        console.error("error loading region:", err)
      }
    }

    loadRegion()
  }, [])

  const handleGenerate = async () => {
    if (!region) {
      setError("Please set your business region in settings first")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const currentYear = new Date().getFullYear()
      const response = await fetchSuggestedHolidays(region, [currentYear, currentYear + 1])

      const sorted = response.holidays.sort((a, b) => {
        const dateA = a.observedDate || a.date
        const dateB = b.observedDate || b.date
        return dateA.localeCompare(dateB)
      })

      setHolidays(sorted)
      setSelectedHolidays(new Set(sorted.map((h) => h.date)))
    } catch (err: any) {
      setError(err.message || "Failed to generate holiday suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleHoliday = (date: string) => {
    const newSet = new Set(selectedHolidays)
    if (newSet.has(date)) {
      newSet.delete(date)
    } else {
      newSet.add(date)
    }
    setSelectedHolidays(newSet)
  }

  const handleApply = async () => {
    const user = auth.currentUser
    if (!user) return

    setIsSaving(true)
    setError(null)

    try {
      const selected = holidays.filter((h) => selectedHolidays.has(h.date))

      const transformed = selected.map((h) => ({
        date: h.observedDate || h.date,
        name: h.name,
        type: "holiday",
        note: h.relevanceNote,
      }))

      await updateDoc(doc(db, "businesses", user.uid), {
        events: arrayUnion(...transformed),
      })

      setSuccess(true)
      setHolidays([])
      setSelectedHolidays(new Set())
    } catch (err: any) {
      setError(err.message || "Failed to save holidays")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card id="holidays-section" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-purple-500/10 rounded-lg" />
      <div className="absolute inset-[1px] bg-background rounded-lg" />

      <div className="relative">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              Suggested Holidays
            </CardTitle>
            <CardDescription>AI-generated holiday suggestions based on your region</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/business-info")}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            View all holidays
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!region && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Set your business region to generate holiday suggestions.</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-primary bg-primary/10">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription>Selected holidays added successfully!</AlertDescription>
            </Alert>
          )}

          {holidays.length === 0 && (
            <Button onClick={handleGenerate} disabled={isLoading || !region} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Holiday Suggestions
                </>
              )}
            </Button>
          )}

          {holidays.length > 0 && (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Holiday</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Relevance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map((holiday) => {
                      const displayDate = holiday.observedDate || holiday.date
                      return (
                        <TableRow key={holiday.date}>
                          <TableCell>
                            <Checkbox
                              checked={selectedHolidays.has(holiday.date)}
                              onCheckedChange={() => toggleHoliday(holiday.date)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{holiday.name}</TableCell>
                          <TableCell>
                            {new Date(displayDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {holiday.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{holiday.relevanceNote}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApply} disabled={isSaving || selectedHolidays.size === 0} className="flex-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    `Add ${selectedHolidays.size} Selected Holiday${selectedHolidays.size !== 1 ? "s" : ""}`
                  )}
                </Button>
                <Button variant="outline" onClick={() => setHolidays([])}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
