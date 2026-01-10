"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

export function StepRecipeMapping() {
  const { updateData } = useOnboarding()

  const skipStep = () => {
    updateData({ recipeMapping: undefined })
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <p className="text-muted-foreground">
          Recipe mapping allows you to track ingredient usage based on product sales. This is optional and can be set up
          later.
        </p>
        <div className="rounded-xl border bg-muted/50 p-6">
          <p className="text-sm text-muted-foreground">
            This feature is coming soon! You can skip this step for now and set up recipe mapping from your dashboard
            later.
          </p>
        </div>
      </div>
      <Button onClick={skipStep} variant="outline" className="gap-2 bg-transparent">
        Skip for now
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
