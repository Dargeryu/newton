"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { speak, stopSpeaking } from "@/lib/client";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "explain";
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const holder = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const Ctor = holder.SpeechRecognition ?? holder.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = false;
  return recognition;
}

const QUICK_REPLIES = ["还是不懂，再简单点", "换个比方讲", "这和刚才那个有什么区别", "我懂了，继续"];

export default function ChatPanel({
  messages,
  streaming,
  onSend,
}: {
  messages: UiMessage[];
  streaming: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!autoSpeak || streaming) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content && last.content !== lastSpokenRef.current) {
      lastSpokenRef.current = last.content;
      speak(last.content);
    }
  }, [autoSpeak, messages, streaming]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    onSend(value);
    setDraft("");
  }

  function toggleMic() {
    const recognition = getRecognition();
    if (!recognition) {
      window.alert("当前浏览器不支持语音输入，请改用文字。");
      return;
    }
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <section className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">学伴对话</h2>
          <p className="text-xs text-slate-500">卡在哪就问哪，讲不明白就说「还是不懂」</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(event) => {
              setAutoSpeak(event.target.checked);
              if (!event.target.checked) stopSpeaking();
            }}
          />
          念给我听
        </label>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            先在左边贴上你正在看的内容，选中看不懂的地方点「不懂」；也可以直接在下面问我。
          </div>
        ) : null}
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2 text-[15px] leading-7 text-white"
                  : "max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3"
              }
            >
              {message.role === "user" ? (
                <span>{message.content}</span>
              ) : (
                <>
                  <Markdown text={message.content || "…"} />
                  {message.content && !streaming ? (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      className="mt-2 text-xs text-slate-500 underline-offset-2 hover:underline"
                    >
                      读出来
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={streaming}
              onClick={() => submit(reply)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-500 hover:text-slate-900 disabled:opacity-40"
            >
              {reply}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            rows={2}
            placeholder="这里哪儿不懂？用你自己的话说就行"
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <button
            type="button"
            onClick={toggleMic}
            className={`rounded-lg border px-3 py-2 text-sm ${
              listening ? "border-red-400 text-red-500" : "border-slate-300 text-slate-600"
            }`}
          >
            {listening ? "听着…" : "说话"}
          </button>
          <button
            type="button"
            onClick={() => submit(draft)}
            disabled={streaming || !draft.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {streaming ? "讲解中…" : "发送"}
          </button>
        </div>
      </div>
    </section>
  );
}
