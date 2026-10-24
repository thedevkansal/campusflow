import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Pill buttons. Primary is the one teal action per screen; secondary is a
// soft teal tint; everything else stays white or transparent.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-sans font-bold whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white shadow-[0_6px_16px_-6px_rgb(11_127_104/0.5)] hover:bg-brand-strong",
        secondary:
          "bg-brand-tint text-brand-strong hover:bg-brand-tint-2",
        outline:
          "border-rule bg-surface text-ink hover:border-brand-tint-2 hover:bg-brand-tint/60 aria-expanded:bg-brand-tint/60",
        ghost:
          "text-ink hover:bg-sunken aria-expanded:bg-sunken",
        destructive:
          "border-danger/30 bg-surface text-danger hover:bg-danger-tint",
        "destructive-solid":
          "bg-danger text-white hover:bg-danger/90",
        link: "h-auto rounded-none px-0 text-brand-strong underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-11 px-5 text-sm",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-7 text-lg",
        icon: "size-11",
        "icon-sm": "size-9",
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
