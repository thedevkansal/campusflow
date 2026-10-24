import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const controlClass =
  "h-12 w-full min-w-0 rounded-xl border border-rule-control bg-surface px-4 text-base text-ink transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-ink-muted/80 hover:border-ink-mutedfocus-visible:border-brand focus-visible:shadow-[0_0_0_4px_var(--brand-tint-2)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 aria-invalid:border-danger aria-invalid:shadow-[0_0_0_4px_var(--danger-tint)]"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(controlClass, className)}
      {...props}
    />
  )
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(controlClass, "cursor-pointer appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export { Input, NativeSelect, controlClass }
