"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Package,
  Megaphone,
  Users,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { fetchWeeklyInsights } from "@/api/ai"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

type AiInsightsSectionProps = {
  hasForecastData: boolean
  className?: string
}

const recommendationIcons = {
  inventory: Package,
  promo: Megaphone,
  staffing: Users,
  data_quality: Database,
}

export function AiInsightsSection({ hasForecastData, className = "" }: AiInsightsSectionProps) {
  const [insights, setInsights] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDetailedExpanded, setIsDetailedExpanded] = useState(false)
  const { user } = useAuth()

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchWeeklyInsights()
      setInsights(result)
    } catch (err: any) {
      setError(err.message || "Failed to generate insights")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    async function loadRecentInsights() {
      if (!user) return

      try {
        const aiOutputsRef = collection(db, "users", user.uid, "ai_outputs")
        const q = query(aiOutputsRef, where("task", "==", "insights_weekly"), orderBy("createdAt", "desc"), limit(1))
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          const data = doc.data()
          if (data.response) {
            setInsights(data.response)
          }
        }
      } catch (err) {
        console.error("Error loading recent insights:", err)
      }
    }

    if (hasForecastData) {
      loadRecentInsights()
    }
  }, [user, hasForecastData])

  if (!hasForecastData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Run a forecast to generate insights.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>Weekly demand analysis and recommendations</CardDescription>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading} variant="secondary" className="gap-2">
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {insights && !isLoading && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-primary">{insights.short}</h3>
              <div className="relative">
                <div
                  className={`text-sm text-muted-foreground leading-relaxed ${!isDetailedExpanded ? "line-clamp-3" : ""}`}
                >
                  {insights.detailed.split(" - ").map((line: string, idx: number) => (
                    <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                      {line.trim()}
                    </p>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailedExpanded(!isDetailedExpanded)}
                  className="mt-2 h-auto p-0 text-xs text-primary hover:bg-transparent"
                >
                  {isDetailedExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              </div>
            </div>

            {insights.metrics && (
              <div className="grid gap-3 md:grid-cols-3">
                {insights.metrics.waste_reduction_0to10 !== undefined && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Waste Reduction Potential</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">
                          {insights.metrics.waste_reduction_0to10}
                        </span>
                        <span className="text-sm text-muted-foreground">/10</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.metrics.promo_roi_0to10 !== undefined && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Promo ROI Likelihood</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">{insights.metrics.promo_roi_0to10}</span>
                        <span className="text-sm text-muted-foreground">/10</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {insights.confidence !== undefined && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Confidence</div>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-primary">{Math.round(insights.confidence * 100)}%</div>
                        <Progress value={insights.confidence * 100} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="flex gap-6">
              {insights.confidence !== undefined && (
                <div className="flex flex-col items-center gap-2 w-20">
                  <div className="text-xs font-medium text-muted-foreground text-center">Confidence</div>
                  <div className="flex-1 w-full flex flex-col items-center gap-2">
                    <div className="text-2xl font-bold text-primary">{Math.round(insights.confidence * 100)}%</div>
                    <div className="relative h-40 w-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-primary transition-all duration-300"
                        style={{ height: `${insights.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {insights.recommendations.map((rec: any, idx: number) => {
                      const Icon = recommendationIcons[rec.type as keyof typeof recommendationIcons] || Package
                      return (
                        <Card key={idx} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {rec.type.replace("_", " ")}
                                  </Badge>
                                  {rec.item && (
                                    <span className="text-xs font-medium text-muted-foreground">• {rec.item}</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium">
                                  {typeof rec.action === "string"
                                    ? rec.action
                                    : rec.action?.title || rec.action?.detail || "Action"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {typeof rec.why === "string"
                                    ? rec.why
                                    : rec.why?.detail || rec.why?.title || "Reason"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {insights.risks && insights.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Potential Risks
                </h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {insights.risks.map((risk: any, idx: number) => (
                    <Alert key={idx} className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <AlertDescription className="space-y-1">
                        {typeof risk === "string" ? (
                          <p className="text-sm">{risk}</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{risk.title}</p>
                            <p className="text-sm text-muted-foreground">{risk.detail}</p>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
