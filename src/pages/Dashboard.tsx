"use client"

import { useForecast } from "@/lib/forecast-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Dashboard() {
  const { forecast, selectedItem, setSelectedItem } = useForecast()
  const navigate = useNavigate()

  if (!forecast) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
            <CardTitle>No Forecast Available</CardTitle>
            <CardDescription>Complete the onboarding process to generate your first forecast</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/onboarding")} className="w-full">
              Start Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const items = Object.keys(forecast)
  const currentItem = selectedItem || items[0]
  const forecastData = forecast[currentItem] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-secondary">Demand Forecast Dashboard</h1>
            <p className="text-muted-foreground">AI-powered demand predictions for the next 7 days</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Forecast</CardTitle>
                <CardDescription>Select a product to view its demand forecast</CardDescription>
              </div>
              <Select value={currentItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Predicted Demand</TableHead>
                  <TableHead className="text-right">Lower Bound</TableHead>
                  <TableHead className="text-right">Upper Bound</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastData.map((point, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {new Date(point.ds).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{point.yhat.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{point.yhat_lower.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{point.yhat_upper.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
