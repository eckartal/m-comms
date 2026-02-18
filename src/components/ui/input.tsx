import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-7 w-full min-w-0 rounded-sm border border-input bg-input px-2.5 py-0 text-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }