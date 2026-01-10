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

export default function OptionCard({ icon, title, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left transition-all hover:border-primary/50",
        selected ? "border-primary bg-accent/30" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold", selected ? "text-primary" : "text-secondary")}>{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        )}
      >
        {selected && <Check className="h-4 w-4" />}
      </div>
    </button>
  )
}
