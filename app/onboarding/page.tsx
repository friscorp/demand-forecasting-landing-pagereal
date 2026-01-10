import { OnboardingProvider } from "@/lib/onboarding-context"
import OnboardingWizard from "@/components/onboarding/onboarding-wizard"

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <main className="min-h-screen bg-muted/30">
        <OnboardingWizard />
      </main>
    </OnboardingProvider>
  )
}
