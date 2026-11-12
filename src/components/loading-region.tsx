/**
 * Hülle um die Skeletons eines ladenden Bereichs: Sie kennzeichnet ihn für
 * Screenreader als beschäftigt. Wird beim Füllen durch den echten Inhalt ersetzt,
 * der dieselbe className trägt.
 */
export function LoadingRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" className={className}>
      {children}
    </div>
  );
}
