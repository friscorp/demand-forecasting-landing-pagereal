import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"

export default function Preferences() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">User Preferences</h1>
          <p className="text-muted-foreground">Customize your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>Manage your profile and notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">User preferences coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
