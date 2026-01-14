import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export default function Items() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Items</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Management
            </CardTitle>
            <CardDescription>View and manage your inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Item management coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
