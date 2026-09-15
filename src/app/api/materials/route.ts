import { NextResponse } from "next/server";
import { z } from "zod";
import { addMaterial, listMaterials } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  learnerId: z.string().min(1),
  title: z.string().default("未命名材料"),
  kind: z.enum(["text", "transcript", "video"]).default("text"),
  body: z.string().default(""),
  sourceUrl: z.string().default(""),
});

export async function GET(request: Request) {
  const learnerId = new URL(request.url).searchParams.get("learnerId") ?? "default";
  return NextResponse.json({ materials: listMaterials(learnerId) });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 400 });
  }
  const { learnerId, title, kind, body, sourceUrl } = parsed.data;
  return NextResponse.json({ material: addMaterial(learnerId, title, kind, body, sourceUrl) });
}
