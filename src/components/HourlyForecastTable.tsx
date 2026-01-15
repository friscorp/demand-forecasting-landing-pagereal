"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  parseISOToZonedParts,
  getDateKeyYYYYMMDD,
  isClosedDate,
  isOpenHour,
  formatDayLabel,
  formatTimeLabel,
  getNext7Days,
  type WeekSchedule,
} from "@/lib/time-filtering"

interface HourlyForecastTableProps {
  selectedItem: string
  hourlyForecastForItem: Array<{ ds: string; yhat: number; yhat_lower: number; yhat_upper: number }>
  businessProfile?: {
    timezone?: string
    hours?: WeekSchedule
    closedDates?: string[]
  }
}

export function HourlyForecastTable({
  selectedItem,
  hourlyForecastForItem,
  businessProfile,
}: HourlyForecastTableProps) {
  const timezone = businessProfile?.timezone || "America/Los_Angeles"
  const hours = businessProfile?.hours
  const closedDates = businessProfile?.closedDates

  // Get the first forecast date to start our 7-day window
  const firstDate = hourlyForecastForItem.length > 0 ? hourlyForecastForItem[0].ds : new Date().toISOString()
  const firstParts = parseISOToZonedParts(firstDate, timezone)
  const firstDateKey = getDateKeyYYYYMMDD(firstParts)

  const availableDays = useMemo(() => getNext7Days(firstDateKey), [firstDateKey])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const currentDateKey = availableDays[currentDayIndex]

  // Filter forecast data for current day
  const filteredRows = useMemo(() => {
    const dayRows = hourlyForecastForItem.filter((point) => {
      const parts = parseISOToZonedParts(point.ds, timezone)
      const dateKey = getDateKeyYYYYMMDD(parts)
      return dateKey === currentDateKey
    })

    // Check if this day is closed
    if (isClosedDate(currentDateKey, closedDates)) {
      return []
    }

    // Filter by business hours
    return dayRows.filter((point) => {
      const parts = parseISOToZonedParts(point.ds, timezone)
      return isOpenHour(parts.weekdayKey, parts.hour, parts.minute, hours)
    })
  }, [hourlyForecastForItem, currentDateKey, timezone, hours, closedDates])

  const dayLabel = formatDayLabel(currentDateKey, timezone)
  const hasPrev = currentDayIndex > 0
  const hasNext = currentDayIndex < availableDays.length - 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDayIndex((i) => Math.max(0, i - 1))}
          disabled={!hasPrev}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>

        <div className="text-lg font-semibold">{dayLabel}</div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDayIndex((i) => Math.min(availableDays.length - 1, i + 1))}
          disabled={!hasNext}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            {isClosedDate(currentDateKey, closedDates) ? "This day is closed" : "No data for this day"}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Low</TableHead>
              <TableHead className="text-right">High</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((point, index) => {
              const parts = parseISOToZonedParts(point.ds, timezone)
              const timeLabel = formatTimeLabel(parts.hour, parts.minute)

              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{timeLabel}</TableCell>
                  <TableCell className="text-right font-semibold">{Math.round(point.yhat)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{point.yhat_lower.toFixed(1)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{point.yhat_upper.toFixed(1)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
