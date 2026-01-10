"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface OptionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

export function OptionCard({ icon, title, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-4 rounded-2xl border-2 bg-card p-6 text-left transition-all hover:border-primary/50",
        selected ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
          selected ? "bg-primary/10" : "bg-muted",
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="mb-1 font-semibold text-secondary">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary" : "border-border bg-background",
        )}
      >
        {selected && <Check className="h-4 w-4 text-primary-foreground" />}
      </div>
    </button>
  )
}
