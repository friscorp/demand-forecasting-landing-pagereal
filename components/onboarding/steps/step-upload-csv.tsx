"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOnboarding } from "@/lib/onboarding-context"

const REQUIRED_FIELDS = [
  { key: "date", label: "Date" },
  { key: "item", label: "Item / Menu Item" },
  { key: "unitsSold", label: "Units Sold" },
]

const OPTIONAL_FIELDS = [
  { key: "unitsMade", label: "Units Made (optional)" },
  { key: "price", label: "Price (optional)" },
  { key: "holidayFlag", label: "Holiday Flag (optional)" },
  { key: "promoFlag", label: "Promo Flag (optional)" },
]

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepUploadCSV({ onValidChange }: StepProps) {
  const { data, updateData, updateColumnMapping } = useOnboarding()
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const hasFile = !!data.uploads.salesFile
    const hasRequiredMappings = !!data.columnMapping.date && !!data.columnMapping.item && !!data.columnMapping.unitsSold
    onValidChange(hasFile && hasRequiredMappings)
  }, [data.uploads.salesFile, data.columnMapping, onValidChange])

  const parseCSVHeaders = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const firstLine = text.split("\n")[0]
      const headers = firstLine.split(",").map((h) => h.trim().replace(/"/g, ""))
      setCsvHeaders(headers)
    }
    reader.readAsText(file)
  }

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        updateData({ uploads: { ...data.uploads, salesFile: file } })
        parseCSVHeaders(file)
      }
    },
    [data.uploads, updateData],
  )

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const removeFile = () => {
    updateData({ uploads: { ...data.uploads, salesFile: null } })
    setCsvHeaders([])
    updateColumnMapping({ date: "", item: "", unitsSold: "", unitsMade: "", price: "", holidayFlag: "", promoFlag: "" })
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Upload your sales history CSV file and map the columns to the required fields.
      </p>

      {/* File Upload */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Sales History CSV (required)</Label>
        {!data.uploads.salesFile ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
              dragActive ? "border-primary bg-accent/30" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-secondary">Drop your CSV file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Supports .csv files</p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl border bg-accent/30 p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-secondary">{data.uploads.salesFile.name}</p>
                <p className="text-xs text-muted-foreground">{csvHeaders.length} columns detected</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Column Mapping */}
      {csvHeaders.length > 0 && (
        <div className="space-y-4">
          <Label className="text-base font-medium">Map Columns</Label>

          <div className="space-y-3">
            <p className="text-sm font-medium text-secondary">Required Fields</p>
            {REQUIRED_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <span className="w-40 text-sm">{field.label}</span>
                <Select
                  value={data.columnMapping[field.key as keyof typeof data.columnMapping] || ""}
                  onValueChange={(value) => updateColumnMapping({ [field.key]: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.columnMapping[field.key as keyof typeof data.columnMapping] && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Optional Fields</p>
            {OPTIONAL_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <span className="w-40 text-sm text-muted-foreground">{field.label}</span>
                <Select
                  value={data.columnMapping[field.key as keyof typeof data.columnMapping] || ""}
                  onValueChange={(value) => updateColumnMapping({ [field.key]: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
