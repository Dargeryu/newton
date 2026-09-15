import { addMessage, getProfile, listConcepts, listFacts, listMessages } from "./db";
import { getEngine, type LlmMessage } from "./llm";
import { buildSystemPrompt } from "./prompts";
import { updateMemory } from "./memory";

export interface RespondInput {
  learnerId: string;
  userVisibleText: string;
  promptText: string;
  kind: "chat" | "explain";
  focusTerm?: string;
}

export function streamAnswer(input: RespondInput): Response {
  const profile = getProfile(input.learnerId);
  const facts = listFacts(input.learnerId);
  const concepts = listConcepts(input.learnerId);
  const history = listMessages(input.learnerId, 12);

  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt(profile, facts, concepts) },
    ...history.map((message) => ({ role: message.role, content: message.content }) satisfies LlmMessage),
    { role: "user", content: input.promptText },
  ];

  addMessage(input.learnerId, "user", input.userVisibleText, input.kind);

  const engine = getEngine();
  const encoder = new TextEncoder();
  let answer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of engine.stream(messages)) {
          answer += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const message = `\n\n[讲解中断：${detail}]`;
        answer += message;
        controller.enqueue(encoder.encode(message));
      }
      controller.close();
      addMessage(input.learnerId, "assistant", answer, input.kind);
      try {
        await updateMemory(input.learnerId, input.userVisibleText, answer, input.focusTerm);
      } catch {
        // memory update is best-effort; never block the learner
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Engine": engine.name,
    },
  });
}
