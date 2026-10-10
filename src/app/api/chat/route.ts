import { NextResponse } from "next/server";
import { z } from "zod";
import { streamAnswer } from "@/lib/respond";

export const runtime = "nodejs";

const bodySchema = z.object({
  learnerId: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });
  }
  const { learnerId, message } = parsed.data;
  return streamAnswer({
    learnerId,
    userVisibleText: message,
    promptText: message,
    kind: "chat",
  });
}
