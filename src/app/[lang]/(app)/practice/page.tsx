import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeData } from "@/components/practice/practice-data";
import { PracticeSkeleton } from "@/components/practice/practice-skeleton";
import { PracticeTitle } from "@/components/practice/practice-title";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.practice.metaTitle}${t.common.titleSuffix}` };
}

/** Gerüst ohne Datenzugriff und ohne Karteninhalte; der Datenbaustein prüft den Zugriff selbst. */
export default async function PracticePage() {
  const t = await getDictionary();
  return (
    <div className="flex flex-col gap-8">
      <PracticeTitle>{t.practice.title}</PracticeTitle>
      <Suspense fallback={<PracticeSkeleton />}>
        <PracticeData />
      </Suspense>
    </div>
  );
}
