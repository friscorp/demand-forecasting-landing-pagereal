"use client"

import { useOnboarding } from "@/lib/onboarding-context"
import { OptionCard } from "../option-card"
import { Store, Coffee, ShoppingBag, Package } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const categories = [
  {
    id: "retail",
    icon: <Store className="h-6 w-6 text-primary" />,
    title: "Retail Store",
    description: "Physical or online retail business",
  },
  {
    id: "restaurant",
    icon: <Coffee className="h-6 w-6 text-primary" />,
    title: "Restaurant/Café",
    description: "Food and beverage service",
  },
  {
    id: "ecommerce",
    icon: <ShoppingBag className="h-6 w-6 text-primary" />,
    title: "E-commerce",
    description: "Online-only business",
  },
  {
    id: "manufacturing",
    icon: <Package className="h-6 w-6 text-primary" />,
    title: "Manufacturing",
    description: "Production and distribution",
  },
]

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
]

const unitOptions = ["units", "pounds", "kilograms", "liters", "gallons"]

export function StepBusinessDetails() {
  const { data, updateData } = useOnboarding()

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-6 text-muted-foreground">What type of business do you operate?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <OptionCard
              key={cat.id}
              icon={cat.icon}
              title={cat.title}
              description={cat.description}
              selected={data.category === cat.id}
              onClick={() => updateData({ category: cat.id })}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={data.timezone} onValueChange={(value) => updateData({ timezone: value })}>
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit of Measure</Label>
          <Select value={data.unitOfMeasure} onValueChange={(value) => updateData({ unitOfMeasure: value })}>
            <SelectTrigger id="unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
