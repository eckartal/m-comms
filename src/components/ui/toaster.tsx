"use client"

import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/components/theme/ThemeProvider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as "dark" | "light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-black dark:group-[.toaster]:text-white dark:group-[.toaster]:border-white/10",
          description: "group-[.toast]:text-zinc-500 dark:group-[.toast]:text-zinc-400",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-900 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }