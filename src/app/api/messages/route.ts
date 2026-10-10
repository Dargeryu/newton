import { NextResponse } from "next/server";
import { listMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const learnerId = new URL(request.url).searchParams.get("learnerId") ?? "default";
  return NextResponse.json({ messages: listMessages(learnerId) });
}
