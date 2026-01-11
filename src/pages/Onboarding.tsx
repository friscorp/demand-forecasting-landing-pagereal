import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { AuthStatus } from "@/components/auth-status"

const Onboarding = () => {
  return (
    <main className="relative min-h-screen bg-background">
      <div className="absolute right-6 top-6 z-50">
        <AuthStatus />
      </div>
      <OnboardingWizard />
    </main>
  )
}

export default Onboarding
