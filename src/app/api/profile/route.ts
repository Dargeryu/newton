import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, listConcepts, listFacts, saveProfile } from "@/lib/db";
import { engineIsLive } from "@/lib/llm";

export const runtime = "nodejs";

const patchSchema = z.object({
  learnerId: z.string().min(1),
  name: z.string().optional(),
  goal: z.string().optional(),
  background: z.string().optional(),
  language: z.string().optional(),
  readingLevel: z.number().int().min(1).max(5).optional(),
  styleNotes: z.string().optional(),
  analogyDomains: z.array(z.string()).optional(),
  constraints: z.string().optional(),
});

export async function GET(request: Request) {
  const learnerId = new URL(request.url).searchParams.get("learnerId") ?? "default";
  return NextResponse.json({
    profile: getProfile(learnerId),
    facts: listFacts(learnerId),
    concepts: listConcepts(learnerId),
    engineLive: engineIsLive(),
  });
}

export async function POST(request: Request) {
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });
  }
  const { learnerId, readingLevel, ...rest } = parsed.data;
  const profile = saveProfile(learnerId, {
    ...rest,
    ...(readingLevel ? { readingLevel: readingLevel as 1 | 2 | 3 | 4 | 5 } : {}),
  });
  return NextResponse.json({ profile });
}
