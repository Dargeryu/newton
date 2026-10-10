"use client";

import { Fragment } from "react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|「[^」]+」)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("「") && part.endsWith("」")) {
      return (
        <span key={index} className="rounded bg-amber-100 px-1 text-amber-900">
          {part}
        </span>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-[15px] leading-7 text-slate-700">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />;
        if (/^\s*[-*]\s+/.test(line)) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="text-slate-400">•</span>
              <span>{renderInline(line.replace(/^\s*[-*]\s+/, ""))}</span>
            </div>
          );
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
