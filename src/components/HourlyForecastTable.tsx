"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import type { HourMask, WeekdayKey } from "@/lib/hour-mask"

interface HourlyForecastTableProps {
  selectedItem: string
  hourlyForecastForItem: Array<{ ds: string; yhat: number; yhat_lower: number; yhat_upper: number }>
  businessProfile?: {
    timezone?: string
    hours?: WeekSchedule
    closedDates?: string[]
  }
  hourMask?: HourMask | null
}

export function HourlyForecastTable({
  selectedItem,
  hourlyForecastForItem,
  businessProfile,
  hourMask,
}: HourlyForecastTableProps) {
  const timezone = businessProfile?.timezone || "America/Los_Angeles"
  const hours = businessProfile?.hours
  const closedDates = businessProfile?.closedDates

  const [useMaskFilter, setUseMaskFilter] = useState(true)

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

    console.log("[v0] HourlyTable: dayRows count before filtering:", dayRows.length)
    if (dayRows.length > 0) {
      const hoursInData = dayRows.map((point) => {
        const parts = parseISOToZonedParts(point.ds, timezone)
        return parts.hour
      })
      console.log("[v0] HourlyTable: all hours in forecast data:", hoursInData)

      const firstPoint = dayRows[0]
      const firstParts = parseISOToZonedParts(firstPoint.ds, timezone)
      console.log("[v0] HourlyTable: first point ds:", firstPoint.ds)
      console.log("[v0] HourlyTable: parsed weekdayKey:", firstParts.weekdayKey, "hour:", firstParts.hour)
      if (useMaskFilter && hourMask) {
        const allowedHours = hourMask[firstParts.weekdayKey as WeekdayKey] || []
        console.log("[v0] HourlyTable: allowedHours for", firstParts.weekdayKey, ":", allowedHours)
      }
    }

    // Check if this day is closed
    if (isClosedDate(currentDateKey, closedDates)) {
      return []
    }

    // Filter by business hours
    let filtered = dayRows
    if (!useMaskFilter) {
      // Only apply business hours filter when mask is disabled
      filtered = dayRows.filter((point) => {
        const parts = parseISOToZonedParts(point.ds, timezone)
        return isOpenHour(parts.weekdayKey, parts.hour, parts.minute, hours)
      })
      console.log("[v0] HourlyTable: rows after business hours filter:", filtered.length)
    } else {
      console.log("[v0] HourlyTable: skipping business hours filter (using hour mask instead)")
    }

    if (useMaskFilter && hourMask) {
      filtered = filtered.filter((point) => {
        const parts = parseISOToZonedParts(point.ds, timezone)
        const weekdayKey = parts.weekdayKey as WeekdayKey
        const allowedHours = hourMask[weekdayKey] || []
        const isAllowed = allowedHours.includes(parts.hour)
        if (!isAllowed) {
          console.log("[v0] HourlyTable: filtering out hour", parts.hour, "for", weekdayKey, "- allowed:", allowedHours)
        }
        return isAllowed
      })
    }

    console.log("[v0] HourlyTable: final filtered rows:", filtered.length)

    return filtered
  }, [hourlyForecastForItem, currentDateKey, timezone, hours, closedDates, useMaskFilter, hourMask])

  const dayLabel = formatDayLabel(currentDateKey, timezone)
  const hasPrev = currentDayIndex > 0
  const hasNext = currentDayIndex < availableDays.length - 1

  const currentWeekdayKey = useMemo(() => {
    const parts = parseISOToZonedParts(currentDateKey + "T12:00:00Z", timezone)
    return parts.weekdayKey as WeekdayKey
  }, [currentDateKey, timezone])

  const maskEmptyForDay =
    useMaskFilter && hourMask && (hourMask[currentWeekdayKey]?.length === 0 || !hourMask[currentWeekdayKey])

  return (
    <div className="space-y-4">
      {hourMask && (
        <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
          <Switch id="mask-toggle" checked={useMaskFilter} onCheckedChange={setUseMaskFilter} />
          <Label htmlFor="mask-toggle" className="text-sm cursor-pointer">
            Show only hours present in uploaded data
          </Label>
        </div>
      )}

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
            {isClosedDate(currentDateKey, closedDates)
              ? "This day is closed"
              : maskEmptyForDay
                ? "No matching hours for this day based on uploaded data"
                : "No data for this day"}
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
