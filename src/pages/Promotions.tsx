import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"

export default function Promotions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Promotions</h1>
          <p className="text-muted-foreground">Create and manage promotional campaigns</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaign Management
            </CardTitle>
            <CardDescription>Plan and execute marketing promotions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Promotions management coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
