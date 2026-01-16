"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useOnboarding } from "@/lib/onboarding-context"
import { useForecast } from "@/lib/forecast-context"
import { useAuth } from "@/lib/auth-context"
import { ArrowRight, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthStatus } from "@/components/auth-status"
import { AuthModal } from "@/components/auth-modal"
import { latestRun } from "@/lib/api"
import heroBackground from "@/assets/hero-background.jpg"

const HeroSection = () => {
  const [businessName, setBusinessName] = useState("")
  const [isLoadingRun, setIsLoadingRun] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const navigate = useNavigate()
  const { updateData } = useOnboarding()
  const { setForecast } = useForecast()
  const { user, loading: authLoading } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (businessName.trim()) {
      updateData({ businessName: businessName.trim() })
      navigate("/onboarding")
    }
  }

  const handleGoToDashboard = async () => {
    if (authLoading) {
      return
    }

    if (!user) {
      setShowAuthModal(true)
      return
    }

    setIsLoadingRun(true)

    try {
      const run = await latestRun()

      if (run && run.forecast && run.forecast.results) {
        setForecast(run.forecast)
        updateData({ businessName: run.businessName })
      }

      navigate("/dashboard")
    } catch (error) {
      console.error("failed to load latest run:", error)
      navigate("/dashboard")
    } finally {
      setIsLoadingRun(false)
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
      </div>

      <div className="absolute right-6 top-6 z-20">
        <AuthStatus />
      </div>

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-secondary md:text-6xl lg:text-7xl">
              Forecast
              <br />
              your demand
              <br />
              <span className="text-primary">with AI.</span>
            </h1>

            <p className="mb-10 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Unlock powerful AI-driven insights for your business.
              <br />
              Predict customer demand, optimize inventory, and make
              <br />
              smarter decisions—all in one platform.
            </p>

            <form onSubmit={handleSubmit} className="max-w-md">
              <div className="flex items-center gap-0 rounded-full bg-card p-2 shadow-lg ring-1 ring-border/50">
                <div className="flex items-center gap-3 pl-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-secondary">My business</span>
                  <div className="h-6 w-px bg-border" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter your business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </form>

            {user && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleGoToDashboard}
                  disabled={isLoadingRun || authLoading}
                  className="bg-card hover:bg-card/90"
                >
                  {isLoadingRun ? "Loading..." : "Go to Dashboard"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </section>
  )
}

export default HeroSection
