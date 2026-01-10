import HeroSection from "@/components/HeroSection"
import { OnboardingProvider } from "@/lib/onboarding-context"

export default function Home() {
  return (
    <OnboardingProvider>
      <main className="min-h-screen bg-background">
        <HeroSection />
      </main>
    </OnboardingProvider>
  )
}
