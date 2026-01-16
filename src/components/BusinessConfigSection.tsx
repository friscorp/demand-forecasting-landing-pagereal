"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Building2, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function BusinessConfigSection() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    location: "",
    timezone: "",
    unitOfMeasure: "",
    leadTime: "",
  })

  const [originalData, setOriginalData] = useState(formData)

  useEffect(() => {
    const loadBusinessData = async () => {
      if (!user) return

      try {
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))
        if (profileDoc.exists()) {
          const data = profileDoc.data()
          const businessData = {
            name: data.name || "",
            industry: data.industry || "",
            location: data.location || "",
            timezone: data.timezone || "",
            unitOfMeasure: data.unitOfMeasure || "",
            leadTime: data.leadTime || "",
          }
          setFormData(businessData)
          setOriginalData(businessData)
        }
      } catch (error) {
        console.error("Error loading business data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadBusinessData()
  }, [user])

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)

  const handleSave = async () => {
    if (!user || !hasChanges) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "businesses", user.uid), {
        ...formData,
        updated_at: Timestamp.now(),
      })

      setOriginalData(formData)
      setShowConfirm(false)
      setSuccessMessage("Business settings updated successfully")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("Error saving business data:", error)
      alert("Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading business configuration...</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Business Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter business name"
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g., restaurant, retail"
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="City, State"
          />
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
          <Select
            value={formData.unitOfMeasure}
            onValueChange={(value) => setFormData({ ...formData, unitOfMeasure: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="units">Units</SelectItem>
              <SelectItem value="dozens">Dozens</SelectItem>
              <SelectItem value="cases">Cases</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="leadTime">Lead Time</Label>
          <Select value={formData.leadTime} onValueChange={(value) => setFormData({ ...formData, leadTime: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select lead time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same-day">Same Day</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="48h">48 Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {successMessage && (
        <Alert className="border-primary/50 bg-primary/5">
          <Check className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">{successMessage}</AlertDescription>
        </Alert>
      )}

      {hasChanges && !showConfirm && (
        <Button onClick={() => setShowConfirm(true)} className="w-full bg-primary hover:bg-primary/90">
          <Building2 className="mr-2 h-4 w-4" />
          Update Business Settings
        </Button>
      )}

      {showConfirm && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="space-y-3">
            <p className="font-medium text-foreground">Confirm changes to your business profile?</p>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm" className="bg-primary hover:bg-primary/90">
                {saving ? "Saving..." : "Confirm"}
              </Button>
              <Button onClick={() => setShowConfirm(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
