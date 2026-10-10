import { NextResponse } from "next/server";
import { z } from "zod";
import { buildExplainPrompt } from "@/lib/prompts";
import { streamAnswer } from "@/lib/respond";

export const runtime = "nodejs";

const bodySchema = z.object({
  learnerId: z.string().min(1),
  term: z.string().min(1),
  context: z.string().default(""),
  materialTitle: z.string().default(""),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });
  }
  const { learnerId, term, context, materialTitle } = parsed.data;
  return streamAnswer({
    learnerId,
    userVisibleText: `我不懂这里：「${term}」`,
    promptText: buildExplainPrompt(term, context, materialTitle),
    kind: "explain",
    focusTerm: term,
  });
}
