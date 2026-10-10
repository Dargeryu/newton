"use client";

import { useState } from "react";
import type { ConceptRecord, LearnerProfile, ProfileFact } from "@/lib/types";

const LEVEL_LABEL: Record<number, string> = {
  1: "L1 基本不识字",
  2: "L2 识字有限",
  3: "L3 能读普通文章",
  4: "L4 有一定基础",
  5: "L5 基础扎实",
};

const CATEGORY_LABEL: Record<ProfileFact["category"], string> = {
  background: "背景",
  psychology: "心理",
  physiology: "状态",
  style: "风格",
  goal: "目标",
  obstacle: "障碍",
};

export default function ProfilePanel({
  profile,
  facts,
  concepts,
  engineLive,
  onSave,
}: {
  profile: LearnerProfile;
  facts: ProfileFact[];
  concepts: ConceptRecord[];
  engineLive: boolean;
  onSave: (patch: Partial<Omit<LearnerProfile, "id" | "updatedAt">>) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [open, setOpen] = useState(false);

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-slate-50">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">学习者档案</h2>
        <p className="mt-1 text-xs text-slate-500">
          讲解难度会随对话自动升降 · 引擎：{engineLive ? "实时模型" : "演示模式"}
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">当前讲解水平</span>
            <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-slate-500 underline-offset-2 hover:underline">
              {open ? "收起" : "编辑档案"}
            </button>
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{LEVEL_LABEL[profile.readingLevel]}</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-slate-900" style={{ width: `${(profile.readingLevel / 5) * 100}%` }} />
          </div>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div>目标：{profile.goal || "未填写"}</div>
            <div>背景：{profile.background || "未填写"}</div>
            <div>熟悉领域：{profile.analogyDomains.join("、") || "未知"}</div>
            <div>限制：{profile.constraints || "未填写"}</div>
          </dl>
        </div>

        {open ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            {(
              [
                ["name", "称呼"],
                ["goal", "想学什么"],
                ["background", "过去的经历/工作"],
                ["styleNotes", "喜欢的说话方式"],
                ["constraints", "时间、精力、身体限制"],
              ] as Array<[keyof LearnerProfile, string]>
            ).map(([key, label]) => (
              <label key={String(key)} className="block text-xs text-slate-600">
                {label}
                <input
                  value={String(draft[key] ?? "")}
                  onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                />
              </label>
            ))}
            <label className="block text-xs text-slate-600">
              熟悉领域（用逗号分隔，用来打比方）
              <input
                value={draft.analogyDomains.join(",")}
                onChange={(event) =>
                  setDraft({ ...draft, analogyDomains: event.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })
                }
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="block text-xs text-slate-600">
              讲解水平
              <select
                value={draft.readingLevel}
                onChange={(event) => setDraft({ ...draft, readingLevel: Number(event.target.value) as LearnerProfile["readingLevel"] })}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {LEVEL_LABEL[level]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                onSave({
                  name: draft.name,
                  goal: draft.goal,
                  background: draft.background,
                  styleNotes: draft.styleNotes,
                  constraints: draft.constraints,
                  analogyDomains: draft.analogyDomains,
                  readingLevel: draft.readingLevel,
                });
                setOpen(false);
              }}
              className="w-full rounded bg-slate-900 px-3 py-2 text-sm text-white"
            >
              保存
            </button>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-medium text-slate-500">概念掌握情况</h3>
          {concepts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">还没有记录，问我第一个不懂的词吧。</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {concepts.slice(0, 20).map((concept) => (
                <li key={concept.id} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800">{concept.term}</span>
                    <span className="text-slate-400">问过 {concept.askedCount} 次</span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-1 rounded-full ${concept.mastery >= 0.6 ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.round(concept.mastery * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-xs font-medium text-slate-500">AI 观察到的画像</h3>
          {facts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">聊几句之后，这里会自动积累。</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {facts.slice(0, 15).map((fact) => (
                <li key={fact.id} className="text-xs text-slate-700">
                  <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {CATEGORY_LABEL[fact.category]}
                  </span>
                  {fact.content}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
