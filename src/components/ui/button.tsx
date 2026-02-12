import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90 active:bg-white/80",
        destructive:
          "bg-red-500/20 text-red-500 hover:bg-red-500/30",
        outline:
          "border border-[#262626] bg-transparent hover:bg-white/5",
        secondary:
          "bg-[#171717] text-white hover:bg-[#262626]",
        ghost:
          "hover:bg-[#171717] text-white",
        link: "text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-7 px-3 has-[>svg]:px-2.5",
        xs: "h-5 gap-1 px-2 text-[10px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-6 gap-1.5 px-2.5 text-[11px] has-[>svg]:px-2",
        lg: "h-8 px-4 has-[>svg]:px-3",
        icon: "size-7",
        "icon-xs": "size-5 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-6",
        "icon-lg": "size-8",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }