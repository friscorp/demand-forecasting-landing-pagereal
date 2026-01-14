import HeroSection from "@/components/HeroSection"
import { AuthStatus } from "@/components/auth-status"

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute right-6 top-6 z-10">
        <AuthStatus />
      </div>
      <HeroSection />
    </main>
  )
}

export default Index
