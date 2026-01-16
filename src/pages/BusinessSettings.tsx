import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"
import { SalesDataUploadSection } from "@/components/SalesDataUploadSection"
import { SuggestedHolidaysPanel } from "@/components/SuggestedHolidaysPanel"
import { EventManagementSection } from "@/components/EventManagementSection" // Added event management
import { BusinessConfigSection } from "@/components/BusinessConfigSection" // Added Business Profile subsection

export default function BusinessSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Business Settings</h1>
          <p className="text-muted-foreground">Configure your business preferences</p>
        </div>

        <SalesDataUploadSection />

        <SuggestedHolidaysPanel />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>Manage business hours, locations, and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Business Profile</h3>
              <BusinessConfigSection />
            </div>

            <div className="border-t pt-8">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Holidays & Closures</h3>
              <EventManagementSection />
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Additional settings coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
