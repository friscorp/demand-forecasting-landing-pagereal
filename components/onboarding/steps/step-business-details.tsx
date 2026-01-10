"use client"

import { useEffect } from "react"
import { Building2, Globe, Package, Scale } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import OptionCard from "../option-card"
import { useOnboarding } from "@/lib/onboarding-context"

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
]

const BUSINESS_TYPES = [
  { value: "bakery", label: "Bakery", description: "Bread, pastries, cakes", icon: <Building2 className="h-5 w-5" /> },
  {
    value: "restaurant",
    label: "Restaurant",
    description: "Full-service dining",
    icon: <Building2 className="h-5 w-5" />,
  },
  { value: "retail", label: "Retail", description: "Product sales", icon: <Package className="h-5 w-5" /> },
  { value: "studio", label: "Studio", description: "Services & appointments", icon: <Building2 className="h-5 w-5" /> },
]

const UNITS = [
  { value: "units", label: "Units" },
  { value: "items", label: "Items" },
  { value: "servings", label: "Servings" },
  { value: "orders", label: "Orders" },
]

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepBusinessDetails({ onValidChange }: StepProps) {
  const { data, updateBusiness } = useOnboarding()

  useEffect(() => {
    const isValid = !!data.business.timezone && !!data.business.category && !!data.business.unitOfMeasure
    onValidChange(isValid)
  }, [data.business, onValidChange])

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Tell us about your business so we can tailor the forecasting experience.</p>

      {/* Business Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">What type of business do you run?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_TYPES.map((type) => (
            <OptionCard
              key={type.value}
              icon={type.icon}
              title={type.label}
              description={type.description}
              selected={data.business.category === type.value}
              onClick={() => updateBusiness({ category: type.value })}
            />
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone" className="text-base font-medium">
          <Globe className="mr-2 inline-block h-4 w-4" />
          Timezone
        </Label>
        <Select value={data.business.timezone} onValueChange={(value) => updateBusiness({ timezone: value })}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit of Measure */}
      <div className="space-y-2">
        <Label htmlFor="unit" className="text-base font-medium">
          <Scale className="mr-2 inline-block h-4 w-4" />
          Unit of Measure
        </Label>
        <Select value={data.business.unitOfMeasure} onValueChange={(value) => updateBusiness({ unitOfMeasure: value })}>
          <SelectTrigger id="unit" className="w-full">
            <SelectValue placeholder="Select unit type" />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((unit) => (
              <SelectItem key={unit.value} value={unit.value}>
                {unit.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
