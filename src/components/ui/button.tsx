import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-red-500 text-white shadow-xs hover:bg-red-600 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/40",
        // NOTE for outline/ghost: these variants are routinely given custom
        // colours via `className` (e.g. the cyan "Browse Programs" CTA), so
        // they deliberately avoid two things the stock shadcn variants do:
        //
        //  - `hover:text-accent-foreground`. In dark mode that token is
        //    #050608 — all but black. A caller that sets only a base
        //    `text-*` keeps the variant's hover colour (tailwind-merge sees
        //    `text-cyan` and `hover:text-*` as different keys, so both
        //    survive), and the label turned near-black on a near-black
        //    surface the moment you hovered or tapped it. The button looked
        //    like it vanished. No hover text colour at all means whatever
        //    colour the caller set simply persists.
        //
        //  - `dark:bg-*` / `dark:hover:bg-*`. Same blind spot: a plain
        //    `bg-cyan/10` from `className` cannot override a `dark:`-prefixed
        //    background, so custom tints were silently dropped in dark mode.
        outline:
          "border bg-background text-foreground shadow-xs hover:bg-accent/15 dark:border-input",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
