"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ItemMetrics } from "@/lib/compute-item-metrics"

type ItemListPanelProps = {
  itemMetrics: ItemMetrics[]
  selectedItem: string | null
  onSelectItem: (item: string) => void
  sortBy: "sevenDayTotal" | "nextOpenDayTotal" | "peak" | "uncertainty"
  onSortChange: (value: "sevenDayTotal" | "nextOpenDayTotal" | "peak" | "uncertainty") => void
}

export function ItemListPanel({ itemMetrics, selectedItem, onSelectItem, sortBy, onSortChange }: ItemListPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Items</h2>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sevenDayTotal">7-Day</SelectItem>
            <SelectItem value="nextOpenDayTotal">Next Day</SelectItem>
            <SelectItem value="peak">Peak</SelectItem>
            <SelectItem value="uncertainty">Uncertainty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {itemMetrics.map((metric) => (
          <Card
            key={metric.item}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedItem === metric.item ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onSelectItem(metric.item)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{metric.item}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Day:</span>
                <span className="font-semibold">{metric.nextOpenDayTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">7-Day:</span>
                <span className="font-semibold">{metric.sevenDayTotal}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
