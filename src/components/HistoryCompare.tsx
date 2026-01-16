"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TrendingUp } from "lucide-react"
import { ingestHistoryHourly, compareDayAcrossYears, type CompareDayResponse } from "@/lib/api"

interface HistoryCompareProps {
  items: string[]
  selectedItem: string
}

export function HistoryCompare({ items, selectedItem }: HistoryCompareProps) {
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<{ count: number; message: string } | null>(null)
  const [ingestError, setIngestError] = useState<string | null>(null)

  const [compareLoading, setCompareLoading] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareDayResponse | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  const [compareItem, setCompareItem] = useState(selectedItem)
  const [compareMonth, setCompareMonth] = useState("01")
  const [compareDay, setCompareDay] = useState("01")

  const handleIngest = async () => {
    setIngestLoading(true)
    setIngestError(null)
    setIngestResult(null)

    try {
      const result = await ingestHistoryHourly()
      setIngestResult(result)
    } catch (error: any) {
      setIngestError(error.message || "Failed to ingest history")
    } finally {
      setIngestLoading(false)
    }
  }

  const handleCompare = async () => {
    setCompareLoading(true)
    setCompareError(null)
    setCompareResult(null)

    try {
      const monthDay = `${compareMonth}-${compareDay}`
      const result = await compareDayAcrossYears({
        item: compareItem,
        monthDay,
      })
      setCompareResult(result)
    } catch (error: any) {
      setCompareError(error.message || "Failed to compare")
    } finally {
      setCompareLoading(false)
    }
  }

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const days = Array.from({ length: 31 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, "0")
    return { value: day, label: day }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Historical Data Ingestion
          </CardTitle>
          <CardDescription>
            Import your latest uploaded data into historical records for year-over-year comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleIngest} disabled={ingestLoading}>
            {ingestLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ingest Latest Upload into History
          </Button>

          {ingestResult && (
            <Alert>
              <AlertDescription>
                Successfully ingested {ingestResult.count} records. {ingestResult.message}
              </AlertDescription>
            </Alert>
          )}

          {ingestError && (
            <Alert variant="destructive">
              <AlertDescription>{ingestError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compare This Date Across Years</CardTitle>
          <CardDescription>View hourly demand for a specific date across multiple years</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compare-item">Item</Label>
              <Select value={compareItem} onValueChange={setCompareItem}>
                <SelectTrigger id="compare-item">
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="compare-month">Month</Label>
              <Select value={compareMonth} onValueChange={setCompareMonth}>
                <SelectTrigger id="compare-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compare-day">Day</Label>
              <Select value={compareDay} onValueChange={setCompareDay}>
                <SelectTrigger id="compare-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {days.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCompare} disabled={compareLoading}>
            {compareLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Compare Date
          </Button>

          {compareError && (
            <Alert variant="destructive">
              <AlertDescription>{compareError}</AlertDescription>
            </Alert>
          )}

          {compareResult && (
            <div className="space-y-2">
              <h4 className="font-semibold">
                {compareResult.item} - {compareResult.monthDay}
              </h4>
              {compareResult.byYear && Object.keys(compareResult.byYear).length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hour</TableHead>
                        {Object.keys(compareResult.byYear)
                          .sort()
                          .map((year) => (
                            <TableHead key={year} className="text-right">
                              {year}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                        const hourStr = hour.toString().padStart(2, "0") + ":00"
                        return (
                          <TableRow key={hour}>
                            <TableCell className="font-medium">{hourStr}</TableCell>
                            {Object.keys(compareResult.byYear)
                              .sort()
                              .map((year) => {
                                const yearData = compareResult.byYear[year]
                                const dataPoint = yearData.find((d) => d.hour === hour)
                                return (
                                  <TableCell key={year} className="text-right">
                                    {dataPoint ? Math.round(dataPoint.y) : "-"}
                                  </TableCell>
                                )
                              })}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No historical data found for this date. Try ingesting your upload data first.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
