import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const controlClass =
  "h-11 w-full min-w-0 rounded-md border border-rule-control bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-[120ms] outline-none placeholder:text-ink-muted/80 hover:border-ink/60 focus-visible:border-ink focus-visible:shadow-[0_0_0_1px_var(--ink)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 aria-invalid:border-danger aria-invalid:shadow-[0_0_0_1px_var(--danger)]"

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
