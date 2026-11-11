import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[max(4rem,12dvh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <main className="flex flex-1 flex-col gap-10">
        <h1 className="type-display text-[clamp(3rem,14.5vw,5rem)] [hyphens:manual]">
          Checkout-Trainer
        </h1>
        <p className="max-w-[34ch] text-lg leading-relaxed font-medium text-muted-foreground">
          Lerne die Checkout-Wege von 170 abwärts mit Karteikarten, die in
          wachsenden Abständen wiederkommen. Dazu übst du, wie es weitergeht,
          wenn statt des Triple nur das Single fällt.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/registrieren" className={cn(buttonVariants({ size: "xl" }))}>
            Registrieren
          </Link>
          <Link
            href="/anmelden"
            className={cn(buttonVariants({ size: "xl", variant: "secondary" }))}
          >
            Anmelden
          </Link>
        </div>
      </main>
      <footer className="flex gap-6 pt-16 text-sm font-medium text-muted-foreground">
        <Link href="/impressum" className="py-2 hover:text-foreground">
          Impressum
        </Link>
        <Link href="/datenschutz" className="py-2 hover:text-foreground">
          Datenschutz
        </Link>
      </footer>
    </div>
  );
}
