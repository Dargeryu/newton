import OpenAI from "openai";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmEngine {
  name: string;
  stream(messages: LlmMessage[]): AsyncIterable<string>;
  json<T>(messages: LlmMessage[], fallback: T): Promise<T>;
}

const MODEL = process.env.LEARNMATE_MODEL ?? "gpt-4o-mini";

function openAiEngine(apiKey: string): LlmEngine {
  const baseURL = process.env.OPENAI_BASE_URL;
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  return {
    name: `openai:${MODEL}`,
    async *stream(messages) {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.4,
        stream: true,
      });
      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
    async json<T>(messages: LlmMessage[], fallback: T): Promise<T> {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
  };
}

function mockEngine(): LlmEngine {
  return {
    name: "mock",
    async *stream(messages) {
      const last = messages[messages.length - 1]?.content ?? "";
      const topic = last.slice(0, 60).replace(/\s+/g, " ");
      const parts = [
        "【演示模式：未配置 OPENAI_API_KEY，以下为占位讲解】\n\n",
        `你现在卡住的地方是：${topic}\n\n`,
        "一句话解释：把它想成你每天都会遇到的一件小事，只是换了个名字。\n\n",
        "打个比方：就像做饭时先备菜再下锅，这个概念说的也是“先准备、后动作”的顺序。\n\n",
        "接下来你可以问我：它和上一句里的说法有什么区别？",
      ];
      for (const part of parts) {
        yield part;
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    },
    async json<T>(_messages: LlmMessage[], fallback: T): Promise<T> {
      return fallback;
    },
  };
}

export function getEngine(): LlmEngine {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) return openAiEngine(apiKey);
  return mockEngine();
}

export function engineIsLive(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
}
