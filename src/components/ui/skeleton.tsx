import { cn } from "@/lib/utils"

/**
 * Platzhalter in der Flächenfarbe, solange Daten laden. Für Screenreader versteckt:
 * Den ladenden Bereich kennzeichnet der Aufrufer mit aria-busy. Maße und bei Bedarf
 * eine andere Rundung (rounded-card, rounded-pill …) kommen über className.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-cell bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
