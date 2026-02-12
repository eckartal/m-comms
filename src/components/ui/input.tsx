import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[#737373] selection:bg-[#f97316] selection:text-black flex h-7 w-full min-w-0 rounded-sm border border-[#262626] bg-[#0a0a0a] px-2.5 py-0 text-xs outline-none transition-[color,box-shadow]",
        "focus-visible:border-[#f97316] focus-visible:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }