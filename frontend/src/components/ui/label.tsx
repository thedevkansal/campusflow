"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-bold text-ink select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/** Label + control + optional hint/error, wired with ids for assistive tech. */
function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-ink-muted">Optional</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export { Label, Field }
