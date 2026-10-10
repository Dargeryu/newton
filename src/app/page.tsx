"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchProfile, getLearnerId, saveProfilePatch } from "@/lib/client";

const STEPS = [
  { key: "name", label: "我怎么称呼你？", placeholder: "比如：老陈" },
  { key: "goal", label: "你想学什么？", placeholder: "比如：想看懂电工基础，考个证" },
  { key: "background", label: "你以前是做什么的？读过多少书？", placeholder: "比如：在工地干了二十年，小学没读完" },
  { key: "analogyDomains", label: "你最熟悉哪些事？（我会拿它们打比方）", placeholder: "比如：砌墙, 种地, 开车" },
  { key: "constraints", label: "有什么现实限制？", placeholder: "比如：每天只有晚上一小时，眼睛看小字累" },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [learnerId, setLearnerId] = useState("");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = getLearnerId();
    setLearnerId(id);
    void fetchProfile(id).then((bundle) => {
      setValues({
        name: bundle.profile.name,
        goal: bundle.profile.goal,
        background: bundle.profile.background,
        analogyDomains: bundle.profile.analogyDomains.join(", "),
        constraints: bundle.profile.constraints,
      });
    });
  }, []);

  const current = STEPS[step];

  async function finish() {
    setSaving(true);
    await saveProfilePatch(learnerId, {
      name: values.name ?? "",
      goal: values.goal ?? "",
      background: values.background ?? "",
      constraints: values.constraints ?? "",
      analogyDomains: (values.analogyDomains ?? "")
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
    router.push("/learn");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold text-slate-900">学伴</h1>
      <p className="mt-2 text-slate-600">
        零基础也能一直学下去。看视频、听音频、读文章时卡在哪，就问哪——我用你听得懂的话，当场讲明白。
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs text-slate-400">
          第 {step + 1} / {STEPS.length} 步
        </div>
        <label className="mt-2 block text-lg font-medium text-slate-900">{current.label}</label>
        <input
          value={values[current.key] ?? ""}
          onChange={(event) => setValues({ ...values, [current.key]: event.target.value })}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (step < STEPS.length - 1) setStep(step + 1);
            else void finish();
          }}
          placeholder={current.placeholder}
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500"
        />
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-sm text-slate-500 disabled:opacity-30"
          >
            上一步
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => void finish()} className="text-sm text-slate-500 hover:text-slate-800">
              跳过，直接开始
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : void finish())}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm text-white disabled:opacity-40"
            >
              {step < STEPS.length - 1 ? "下一步" : saving ? "进入中…" : "开始学习"}
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-8 space-y-2 text-sm text-slate-500">
        <li>· 选中看不懂的字词句，一键得到你能懂的解释</li>
        <li>· 说「还是不懂」，讲解会自动变得更简单</li>
        <li>· 支持文字、语音输入和朗读；视频/音频可贴链接或导入字幕</li>
      </ul>
    </main>
  );
}
