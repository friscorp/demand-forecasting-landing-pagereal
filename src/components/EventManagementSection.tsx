"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Plus, AlertCircle } from "lucide-react"
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BusinessEvent {
  date: string
  type: "holiday" | "closure"
  description: string
}

export function EventManagementSection() {
  const { user } = useAuth()
  const [eventType, setEventType] = useState<"holiday" | "closure">("holiday")
  const [eventDate, setEventDate] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSaveEvent = async () => {
    if (!user || !eventDate || !eventDescription.trim()) {
      setError("Please fill in all fields")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const db = getFirestore()
      const businessRef = doc(db, "businesses", user.uid)

      const newEvent: BusinessEvent = {
        date: eventDate,
        type: eventType,
        description: eventDescription.trim(),
      }

      await updateDoc(businessRef, {
        events: arrayUnion(newEvent),
      })

      setSuccess(true)
      setEventDate("")
      setEventDescription("")
      setEventType("holiday")

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving event:", err)
      setError("Failed to save event. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Closures & Events
        </CardTitle>
        <CardDescription>Add holidays, closures, and special events to your business calendar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>Event saved successfully!</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={(value: "holiday" | "closure") => setEventType(value)}>
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="closure">Closure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Input
              id="event-description"
              placeholder={eventType === "holiday" ? "e.g., MLK Day" : "e.g., Maintenance closure"}
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
            />
          </div>

          <Button onClick={handleSaveEvent} disabled={isSaving || !eventDate || !eventDescription.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Add Event"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Events will be automatically considered in forecast calculations to account for demand changes on special
          days.
        </p>
      </CardContent>
    </Card>
  )
}
