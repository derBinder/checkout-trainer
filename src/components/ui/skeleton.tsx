import { cn } from "@/lib/utils"

/**
 * Platzhalter in der Flächenfarbe, solange Daten laden. Für Screenreader versteckt:
 * Den ladenden Bereich kennzeichnet der Aufrufer mit aria-busy. Maße und genau eine
 * Rundung (rounded-cell, rounded-pill …) kommen über className: cn führt die eigenen
 * Rundungen des Themas nicht zusammen, eine Vorgabe hier stünde sonst daneben.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
