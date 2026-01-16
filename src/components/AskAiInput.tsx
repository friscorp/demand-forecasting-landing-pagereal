"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Send } from "lucide-react"
import { askAiQuestion } from "@/api/ai"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

type AskAiInputProps = {
  itemContext?: string | null
  className?: string
}

export function AskAiInput({ itemContext, className = "" }: AskAiInputProps) {
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const contextualQuestion = itemContext ? `${question} (for ${itemContext})` : question

      const result = await askAiQuestion(contextualQuestion)
      setResponse(result)

      // Scroll to response
      setTimeout(() => {
        document.getElementById("ai-response")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 100)
    } catch (err: any) {
      setError(err.message || "Failed to get AI response")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask AI
          </CardTitle>
          <CardDescription>
            Get insights about demand, inventory, or promotions
            {itemContext && <span className="block mt-1 text-primary">Asking about: {itemContext}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about demand, inventory, or promotions…"
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !question.trim()} className="gap-2">
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isLoading ? "Thinking..." : "Ask"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {response && (
            <Card id="ai-response" className="mt-4 border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-3">
                <div>
                  <p className="font-semibold text-lg text-primary mb-2">{response.short}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{response.detailed}</p>
                </div>

                {response.confidence !== undefined && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Confidence</span>
                      <span className="font-medium">{Math.round(response.confidence * 100)}%</span>
                    </div>
                    <Progress value={response.confidence * 100} className="h-1.5" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
