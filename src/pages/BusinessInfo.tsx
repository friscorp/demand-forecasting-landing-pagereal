"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Package, MapPin, Clock } from "lucide-react"
import { format } from "date-fns"

interface BusinessEvent {
  date: string
  type: "holiday" | "promotion" | "closure"
  description: string
  name?: string
}

interface BusinessProfile {
  name?: string
  location?: string
  timezone?: string
  events?: BusinessEvent[]
}

export default function BusinessInfo() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const db = getFirestore()
        const profileDoc = await getDoc(doc(db, "businesses", user.uid))

        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as BusinessProfile)
        }
      } catch (error) {
        console.error("Failed to load business profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "holiday":
        return "bg-green-100 text-green-800 border-green-200"
      case "promotion":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "closure":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">Business Info</h1>
          <p className="text-muted-foreground">Loading business information...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">Business Info</h1>
          <p className="text-muted-foreground">Please sign in to view business information</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Business Info</h1>
        <p className="text-muted-foreground">View your business details and important dates</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Business Overview
            </CardTitle>
            <CardDescription>Basic information about your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.name && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                  <p className="text-base font-semibold">{profile.name}</p>
                </div>
              </div>
            )}

            {profile?.location && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-base font-semibold">{profile.location}</p>
                </div>
              </div>
            )}

            {profile?.timezone && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                  <p className="text-base font-semibold">{profile.timezone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Holidays & Events
            </CardTitle>
            <CardDescription>Important dates that may affect demand</CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.events && profile.events.length > 0 ? (
              <div className="space-y-3">
                {profile.events
                  .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
                  .map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-3 py-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {format(parseDate(event.date), "MMM")}
                          </span>
                          <span className="text-lg font-bold text-primary">{format(parseDate(event.date), "dd")}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-secondary">
                            {event.description || event.name || "Unnamed Event"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseDate(event.date), "EEEE, MMMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getEventBadgeColor(event.type)}>
                        {event.type}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No holidays or events configured yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory Settings
            </CardTitle>
            <CardDescription>Product inventory and stock management</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground py-8">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
