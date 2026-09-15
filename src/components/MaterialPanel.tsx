"use client";

import { useRef, useState } from "react";
import type { Material } from "@/lib/types";

function embedUrl(raw: string): string | null {
  if (!raw) return null;
  const youtube = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const bilibili = raw.match(/bilibili\.com\/video\/(BV[\w]+)/);
  if (bilibili) return `https://player.bilibili.com/player.html?bvid=${bilibili[1]}&autoplay=0`;
  return null;
}

function stripSubtitleMarkup(text: string): string {
  return text
    .replace(/^\d+\s*$/gm, "")
    .replace(/^[\d:,.]+\s-->\s[\d:,.]+.*$/gm, "")
    .replace(/^WEBVTT.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function MaterialPanel({
  material,
  onMaterialChange,
  onExplain,
  busy,
}: {
  material: { title: string; kind: Material["kind"]; body: string; sourceUrl: string };
  onMaterialChange: (next: { title: string; kind: Material["kind"]; body: string; sourceUrl: string }) => void;
  onExplain: (term: string, context: string) => void;
  busy: boolean;
}) {
  const [selection, setSelection] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const embed = embedUrl(material.sourceUrl);

  function captureSelection() {
    const text = window.getSelection()?.toString().trim() ?? "";
    setSelection(text.slice(0, 200));
  }

  function contextAround(term: string): string {
    const index = material.body.indexOf(term);
    if (index < 0) return material.body.slice(0, 600);
    return material.body.slice(Math.max(0, index - 300), index + term.length + 300);
  }

  async function loadFile(file: File) {
    const text = await file.text();
    const isSubtitle = /\.(srt|vtt)$/i.test(file.name);
    onMaterialChange({
      ...material,
      title: material.title || file.name,
      kind: isSubtitle ? "transcript" : "text",
      body: isSubtitle ? stripSubtitleMarkup(text) : text,
    });
  }

  return (
    <section className="flex h-full flex-col border-r border-slate-200 bg-white">
      <header className="space-y-2 border-b border-slate-200 px-4 py-3">
        <input
          value={material.title}
          onChange={(event) => onMaterialChange({ ...material, title: event.target.value })}
          placeholder="材料标题，例如：第一课 什么是电流"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="flex gap-2">
          <input
            value={material.sourceUrl}
            onChange={(event) =>
              onMaterialChange({
                ...material,
                sourceUrl: event.target.value,
                kind: embedUrl(event.target.value) ? "video" : material.kind,
              })
            }
            placeholder="视频链接（YouTube / B 站，可留空）"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
          >
            导入字幕/文本
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.srt,.vtt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {embed ? (
        <div className="aspect-video w-full bg-black">
          <iframe src={embed} title="学习视频" allowFullScreen className="h-full w-full" />
        </div>
      ) : null}

      <div className="relative flex-1 overflow-y-auto px-4 py-3" onMouseUp={captureSelection} onTouchEnd={captureSelection}>
        {material.body ? (
          <div ref={bodyRef} className="whitespace-pre-wrap text-[15px] leading-8 text-slate-800">
            {material.body}
          </div>
        ) : (
          <textarea
            value={material.body}
            onChange={(event) => onMaterialChange({ ...material, body: event.target.value })}
            placeholder="把你正在看的课文、字幕、文章贴进来。贴好之后，选中任何看不懂的字词或句子，点「不懂」。"
            className="h-full w-full resize-none rounded-lg border border-dashed border-slate-300 p-3 text-[15px] leading-8 outline-none focus:border-slate-500"
          />
        )}
      </div>

      <footer className="border-t border-slate-200 px-4 py-3">
        {selection ? (
          <div className="flex items-center gap-3">
            <span className="line-clamp-1 flex-1 text-sm text-slate-600">选中：{selection}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onExplain(selection, contextAround(selection))}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              不懂，讲一下
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>选中文字后这里会出现「不懂，讲一下」</span>
            {material.body ? (
              <button
                type="button"
                onClick={() => onMaterialChange({ ...material, body: "" })}
                className="underline-offset-2 hover:underline"
              >
                换一份材料
              </button>
            ) : null}
          </div>
        )}
      </footer>
    </section>
  );
}
