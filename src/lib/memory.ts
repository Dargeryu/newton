import { addFact, getProfile, saveProfile, upsertConcept } from "./db";
import { getEngine } from "./llm";
import { MEMORY_EXTRACTION_PROMPT } from "./prompts";
import type { ProfileFact, ReadingLevel } from "./types";

interface ExtractionResult {
  facts: Array<{ category: ProfileFact["category"]; content: string; confidence: number }>;
  readingLevelDelta: number;
  analogyDomains: string[];
  concepts: Array<{ term: string; masteryDelta: number }>;
}

const EMPTY: ExtractionResult = { facts: [], readingLevelDelta: 0, analogyDomains: [], concepts: [] };

const VALID_CATEGORIES: ProfileFact["category"][] = [
  "background",
  "psychology",
  "physiology",
  "style",
  "goal",
  "obstacle",
];

const CONFUSION_MARKERS = ["还是不懂", "不明白", "没听懂", "看不懂", "太难", "更简单", "听不明白", "不理解"];
const CONFIDENCE_MARKERS = ["懂了", "明白了", "理解了", "清楚了", "会了"];

export function heuristicLevelDelta(userText: string): number {
  if (CONFUSION_MARKERS.some((marker) => userText.includes(marker))) return -1;
  if (CONFIDENCE_MARKERS.some((marker) => userText.includes(marker))) return 0;
  return 0;
}

export async function updateMemory(
  learnerId: string,
  userText: string,
  assistantText: string,
  focusTerm?: string,
): Promise<void> {
  const engine = getEngine();
  const extraction = await engine.json<ExtractionResult>(
    [
      { role: "system", content: MEMORY_EXTRACTION_PROMPT },
      { role: "user", content: `学习者：${userText}\n\n助教：${assistantText}` },
    ],
    EMPTY,
  );

  for (const fact of extraction.facts ?? []) {
    if (!fact?.content) continue;
    const category = VALID_CATEGORIES.includes(fact.category) ? fact.category : "background";
    addFact(learnerId, category, fact.content, typeof fact.confidence === "number" ? fact.confidence : 0.6);
  }

  for (const concept of extraction.concepts ?? []) {
    if (!concept?.term) continue;
    const delta = typeof concept.masteryDelta === "number" ? concept.masteryDelta : 0.1;
    upsertConcept(learnerId, concept.term, assistantText.slice(0, 500), delta);
  }

  if (focusTerm) {
    upsertConcept(learnerId, focusTerm, assistantText.slice(0, 500), heuristicLevelDelta(userText) < 0 ? -0.1 : 0.15);
  }

  const profile = getProfile(learnerId);
  const delta = extraction.readingLevelDelta || heuristicLevelDelta(userText);
  const domains = Array.from(new Set([...profile.analogyDomains, ...(extraction.analogyDomains ?? [])])).slice(0, 8);
  const nextLevel = Math.min(5, Math.max(1, profile.readingLevel + delta)) as ReadingLevel;

  if (nextLevel !== profile.readingLevel || domains.length !== profile.analogyDomains.length) {
    saveProfile(learnerId, { readingLevel: nextLevel, analogyDomains: domains });
  }
}
