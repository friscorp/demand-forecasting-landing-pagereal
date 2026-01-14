import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { OnboardingProvider } from "@/lib/onboarding-context"
import { ForecastProvider } from "@/lib/forecast-context"
import { AuthProvider } from "@/lib/auth-context"
import Index from "./pages/Index"
import Onboarding from "./pages/Onboarding"
import Dashboard from "./pages/Dashboard"
import NotFound from "./pages/NotFound"
import { AppLayout } from "@/components/app-layout"
import Items from "./pages/Items"
import Promotions from "./pages/Promotions"
import BusinessSettings from "./pages/BusinessSettings"
import Preferences from "./pages/Preferences"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OnboardingProvider>
            <ForecastProvider>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/items" element={<Items />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/business-settings" element={<BusinessSettings />} />
                  <Route path="/preferences" element={<Preferences />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </ForecastProvider>
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
