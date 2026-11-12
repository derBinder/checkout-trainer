import type { Metadata } from "next";
import { Suspense } from "react";
import { StudySessionData } from "@/components/study/study-data";
import { StudySkeleton } from "@/components/study/study-skeleton";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.study.metaTitle}${t.common.titleSuffix}` };
}

/** Gerüst ohne Datenzugriff; der Datenbaustein prüft den Zugriff selbst. */
export default function StudyPage() {
  return (
    <Suspense fallback={<StudySkeleton />}>
      <StudySessionData />
    </Suspense>
  );
}
