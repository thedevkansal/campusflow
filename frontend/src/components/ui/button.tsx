import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Primary is a physical "key": marigold fill with a darker bottom edge that
// collapses on press. Everything else stays quiet so the one action per screen wins.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-sans font-bold whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-[120ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-signal text-signal-ink border-signal-edge shadow-[inset_0_-2px_0_var(--signal-edge)] hover:brightness-[1.04] active:translate-y-px active:shadow-[inset_0_0_0_var(--signal-edge)]",
        ink:
          "bg-ink text-paper hover:bg-ink/90 active:translate-y-px",
        outline:
          "border-rule-control bg-surface text-ink hover:bg-sunken active:translate-y-px aria-expanded:bg-sunken",
        secondary:
          "bg-sunken text-ink hover:bg-rule/70 active:translate-y-px",
        ghost:
          "text-ink hover:bg-sunken active:bg-rule/60 aria-expanded:bg-sunken",
        destructive:
          "border-danger/40 bg-surface text-danger hover:bg-danger-tint active:translate-y-px",
        "destructive-solid":
          "bg-danger text-white hover:bg-danger/90 active:translate-y-px dark:text-paper",
        link: "h-auto px-0 text-ink underline decoration-rule-control underline-offset-4 hover:decoration-ink",
      },
      size: {
        default: "h-10 px-4 text-sm",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-5 text-base",
        xl: "h-14 px-6 text-lg rounded-lg",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
