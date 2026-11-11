import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

export type StrengthLevel = 0 | 1 | 2 | 3;
export type Strength = {
  level: StrengthLevel;
  label: "Schwach" | "Mittel" | "Gut" | "Stark";
  percent: 25 | 50 | 75 | 100;
};

const LEVELS: Strength[] = [
  { level: 0, label: "Schwach", percent: 25 },
  { level: 1, label: "Mittel", percent: 50 },
  { level: 2, label: "Gut", percent: 75 },
  { level: 3, label: "Stark", percent: 100 },
];

const OBVIOUS_PARTS = [
  "passwor",
  "123456",
  "qwert",
  "asdf",
  "darts",
  "checkout",
];

function characterKinds(value: string): number {
  let kinds = 0;
  if (/\p{Ll}/u.test(value)) kinds += 1;
  if (/\p{Lu}/u.test(value)) kinds += 1;
  if (/\p{Nd}/u.test(value)) kinds += 1;
  if (/[^\p{L}\p{Nd}]/u.test(value) || /\p{Lo}/u.test(value)) kinds += 1;
  return kinds;
}

function lengthPoints(length: number): number {
  if (length >= 20) return 3;
  if (length >= 16) return 2;
  if (length >= 12) return 1;
  return 0;
}

function distinctPoints(distinct: number): number {
  if (distinct >= 12) return 2;
  if (distinct >= 8) return 1;
  return 0;
}

/** Nur ein Hinweis, blockiert nie. null bei leerem Wert. */
export function passwordStrength(value: string): Strength | null {
  if (value === "") return null;
  if (value.length < MIN_PASSWORD_LENGTH) return LEVELS[0];

  const distinct = new Set(Array.from(value)).size;
  if (distinct === 1) return LEVELS[0];

  const lower = value.toLowerCase();
  const penalty =
    OBVIOUS_PARTS.filter((part) => lower.includes(part)).length * 2;
  const score =
    lengthPoints(value.length) +
    (characterKinds(value) - 1) +
    distinctPoints(distinct) -
    penalty;

  if (score >= 6) return LEVELS[3];
  if (score >= 4) return LEVELS[2];
  if (score >= 2) return LEVELS[1];
  return LEVELS[0];
}

export function strengthHint(value: string): string {
  if (value === "") return "";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Noch ${MIN_PASSWORD_LENGTH - value.length} Zeichen bis zum Minimum.`;
  }
  if (passwordStrength(value)?.level === 3) return "";
  return "Länger oder gemischter wird stärker.";
}
