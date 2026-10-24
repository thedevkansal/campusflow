"use client"

import * as React from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Confirm step for irreversible actions (cancel ride, decline ride, log out).
 * The trigger is rendered by the caller via `trigger`; the confirm button
 * repeats the action's verb so the choice is unambiguous.
 */
function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  destructive = true,
  onConfirm,
  open,
  onOpenChange,
}: {
  trigger: React.ReactElement
  title: string
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className={cn(
            "fixed inset-0 z-[90] bg-ink/35 transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          )}
        />
        <AlertDialog.Popup
          className={cn(
            "fixed bottom-0 left-1/2 z-[95] w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-surface p-6 text-ink shadow-sheet outline-none",
            "sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-3xl",
            "transition-[opacity,transform] duration-200 ease-out",
            "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:data-[starting-style]:-translate-y-[46%]",
            "data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 sm:data-[ending-style]:-translate-y-[46%]"
          )}
        >
          <AlertDialog.Title className="text-xl font-extrabold tracking-[-0.02em]">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-base text-ink-muted">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close render={<Button variant="outline" size="lg" />}>
              {cancelLabel}
            </AlertDialog.Close>
            <AlertDialog.Close
              render={<Button variant={destructive ? "destructive-solid" : "default"} size="lg" />}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { ConfirmDialog }
