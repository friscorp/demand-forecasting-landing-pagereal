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
import { BackgroundForecastChart } from "@/components/BackgroundForecastChart"

interface HourlyForecastTableProps {
  selectedItem: string
  hourlyForecastForItem: Array<{ ds: string; yhat: number; yhat_lower: number; yhat_upper: number }>
  businessProfile?: {
    timezone?: string
    hours?: WeekSchedule
    closedDates?: string[]
  }
  hourMask?: HourMask | null
  maskEnabled?: boolean
  onMaskEnabledChange?: (enabled: boolean) => void
}

export function HourlyForecastTable({
  selectedItem,
  hourlyForecastForItem,
  businessProfile,
  hourMask,
  maskEnabled = true,
  onMaskEnabledChange,
}: HourlyForecastTableProps) {
  const [useMaskFilter, setUseMaskFilter] = useState(true)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)

  const timezone = businessProfile?.timezone || "America/Los_Angeles"
  const hours = businessProfile?.hours
  const closedDates = businessProfile?.closedDates

  const hasData = hourlyForecastForItem && hourlyForecastForItem.length > 0

  const firstDate = hasData ? hourlyForecastForItem[0].ds : new Date().toISOString()
  const firstParts = parseISOToZonedParts(firstDate, timezone)
  const firstDateKey = getDateKeyYYYYMMDD(firstParts)

  const availableDays = useMemo(() => getNext7Days(firstDateKey), [firstDateKey])
  const currentDateKey = availableDays[currentDayIndex]

  // Filter forecast data for current day
  const filteredRows = useMemo(() => {
    if (!hasData) return []

    const dayRows = hourlyForecastForItem.filter((point) => {
      const parts = parseISOToZonedParts(point.ds, timezone)
      const dateKey = getDateKeyYYYYMMDD(parts)
      return dateKey === currentDateKey
    })

    if (isClosedDate(currentDateKey, closedDates)) {
      return []
    }

    let filtered = dayRows
    if (!useMaskFilter) {
      filtered = dayRows.filter((point) => {
        const parts = parseISOToZonedParts(point.ds, timezone)
        return isOpenHour(parts.weekdayKey, parts.hour, parts.minute, hours)
      })
    }

    if (useMaskFilter && hourMask) {
      filtered = filtered.filter((point) => {
        const parts = parseISOToZonedParts(point.ds, timezone)
        const weekdayKey = parts.weekdayKey as WeekdayKey
        const allowedHours = hourMask[weekdayKey] || []
        return allowedHours.includes(parts.hour)
      })
    }

    return filtered
  }, [hourlyForecastForItem, currentDateKey, timezone, hours, closedDates, useMaskFilter, hourMask, hasData])

  const currentWeekdayKey = useMemo(() => {
    const parts = parseISOToZonedParts(currentDateKey + "T12:00:00Z", timezone)
    return parts.weekdayKey as WeekdayKey
  }, [currentDateKey, timezone])

  const maskEmptyForDay =
    useMaskFilter && hourMask && (hourMask[currentWeekdayKey]?.length === 0 || !hourMask[currentWeekdayKey])

  const dayLabel = formatDayLabel(currentDateKey, timezone)
  const hasPrev = currentDayIndex > 0
  const hasNext = currentDayIndex < availableDays.length - 1

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hourly forecast data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hourMask && (
        <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
          <Switch
            id="mask-toggle"
            checked={useMaskFilter}
            onCheckedChange={(checked) => {
              setUseMaskFilter(checked)
              onMaskEnabledChange?.(checked)
            }}
          />
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
        <div className="relative">
          <BackgroundForecastChart data={filteredRows} />
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
        </div>
      )}
    </div>
  )
}
