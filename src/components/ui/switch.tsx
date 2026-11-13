"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

/** Maße des Schalters, auch für seinen Platzhalter im Skeleton. */
export const switchShape = "h-7 w-12 rounded-pill"

/** Ein-/Aus-Schalter (Base UI): an in der Hauptfarbe, aus in der Farbe der Feldränder. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        switchShape,
        "inline-flex shrink-0 cursor-pointer items-center border-2 border-transparent bg-input transition-colors outline-offset-2 outline-ring focus-visible:outline-2 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 rounded-pill bg-background shadow-sm transition-transform data-checked:translate-x-5 data-unchecked:translate-x-0 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
