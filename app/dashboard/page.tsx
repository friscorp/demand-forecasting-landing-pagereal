import { OnboardingProvider } from "@/lib/onboarding-context"

export default function DashboardPage() {
  return (
    <OnboardingProvider>
      <main className="min-h-screen bg-muted/30 p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Your 7-day demand forecast will appear here.</p>

          {/* Placeholder for dashboard content */}
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-secondary">Next 7 Days</h3>
              <p className="mt-1 text-sm text-muted-foreground">Forecast overview</p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-secondary">Top Items</h3>
              <p className="mt-1 text-sm text-muted-foreground">By forecasted demand</p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold text-secondary">AI Insights</h3>
              <p className="mt-1 text-sm text-muted-foreground">Recommendations</p>
            </div>
          </div>
        </div>
      </main>
    </OnboardingProvider>
  )
}
