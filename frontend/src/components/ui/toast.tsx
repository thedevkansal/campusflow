"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"
import { Check, CircleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Toasts confirm that an action landed, using the same verb as the button
 * that triggered it ("Request ride" → "Ride requested").
 * Usage: const toast = useToast(); toast.success('Ride requested')
 */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={4000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex w-auto max-w-sm flex-col-reverse gap-2 outline-none sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0 sm:w-96">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-rule bg-surface py-3 pr-2 pl-3.5 text-ink shadow-sheet outline-none",
        "transition-[opacity,transform] duration-200 ease-out",
        "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
        "data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
          toast.type === "error" ? "bg-danger-tint text-danger" : "bg-success-tint text-success"
        )}
      >
        {toast.type === "error" ? (
          <CircleAlert className="size-3.5" strokeWidth={2.5} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </span>
      <Toast.Content className="min-w-0 flex-1">
        <Toast.Title className="text-sm font-bold" />
        <Toast.Description className="mt-0.5 text-sm text-ink-muted" />
      </Toast.Content>
      <Toast.Close
        aria-label="Dismiss"
        className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        <X className="size-4" />
      </Toast.Close>
    </Toast.Root>
  ))
}

function useToast() {
  const manager = Toast.useToastManager()
  return React.useMemo(
    () => ({
      success: (title: string, description?: string) =>
        manager.add({ title, description, type: "success" }),
      error: (title: string, description?: string) =>
        manager.add({ title, description, type: "error", priority: "high" }),
    }),
    [manager]
  )
}

export { ToastProvider, useToast }
