"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useOnboarding } from "@/context/OnboardingContext"
import { ArrowRight, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import heroBackground from "@/assets/hero-background.jpg"

const HeroSection = () => {
  const [businessName, setBusinessName] = useState("")
  const navigate = useNavigate()
  const { updateData } = useOnboarding()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (businessName.trim()) {
      updateData({ businessName: businessName.trim() })
      navigate("/onboarding")
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            {/* Headline */}
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-secondary md:text-6xl lg:text-7xl">
              Forecast
              <br />
              your demand
              <br />
              <span className="text-primary">with AI.</span>
            </h1>

            {/* Description */}
            <p className="mb-10 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Unlock powerful AI-driven insights for your business.
              <br />
              Predict customer demand, optimize inventory, and make
              <br />
              smarter decisions—all in one platform.
            </p>

            {/* Business Name Input */}
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
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
