"use client"

import type React from "react"

import { useOnboarding } from "@/lib/onboarding-context"
import { useState } from "react"
import { Upload } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const requiredColumns = ["date", "item", "quantity"]

export function StepUploadCSV() {
  const { data, updateData } = useOnboarding()
  const [dragActive, setDragActive] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])

  const handleFile = (file: File) => {
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      updateData({ csvFile: file })

      // Read CSV headers
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const firstLine = text.split("\n")[0]
        const headers = firstLine.split(",").map((h) => h.trim())
        setCsvHeaders(headers)
      }
      reader.readAsText(file)
    }
  }

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

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
    }
  }

  const updateColumnMapping = (required: string, header: string) => {
    updateData({
      csvColumns: { ...data.csvColumns, [required]: header },
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-6 text-muted-foreground">Upload your historical sales data (CSV format)</p>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/50"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-medium text-secondary">
            {data.csvFile ? data.csvFile.name : "Drop your CSV file here"}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse files</p>
        </div>
      </div>

      {csvHeaders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-secondary">Map Your Columns</h3>
          <p className="text-sm text-muted-foreground">Match your CSV columns to our required fields</p>
          {requiredColumns.map((col) => (
            <div key={col} className="grid gap-2 sm:grid-cols-2">
              <Label className="flex items-center capitalize">{col}</Label>
              <Select value={data.csvColumns?.[col] ?? ""} onValueChange={(value) => updateColumnMapping(col, value)}>
                <SelectTrigger>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
