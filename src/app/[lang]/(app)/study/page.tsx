import { Suspense } from "react";
import { StudySessionData } from "@/components/study/study-data";
import { StudySkeleton } from "@/components/study/study-skeleton";

/** Gerüst ohne Datenzugriff; der Datenbaustein prüft den Zugriff selbst. */
export default function StudyPage() {
  return (
    <Suspense fallback={<StudySkeleton />}>
      <StudySessionData />
    </Suspense>
  );
}
