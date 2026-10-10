"use client";

import { useCallback, useEffect, useState } from "react";
import ChatPanel, { type UiMessage } from "@/components/ChatPanel";
import MaterialPanel from "@/components/MaterialPanel";
import ProfilePanel from "@/components/ProfilePanel";
import {
  fetchMessages,
  fetchProfile,
  getLearnerId,
  saveMaterial,
  saveProfilePatch,
  streamPost,
  type ProfileBundle,
} from "@/lib/client";
import type { LearnerProfile, Material } from "@/lib/types";

type MaterialDraft = { title: string; kind: Material["kind"]; body: string; sourceUrl: string };

const EMPTY_MATERIAL: MaterialDraft = { title: "", kind: "text", body: "", sourceUrl: "" };

export default function LearnPage() {
  const [learnerId, setLearnerId] = useState("");
  const [bundle, setBundle] = useState<ProfileBundle | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [material, setMaterial] = useState<MaterialDraft>(EMPTY_MATERIAL);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const id = getLearnerId();
    setLearnerId(id);
    void fetchProfile(id).then(setBundle);
    void fetchMessages(id).then((history) =>
      setMessages(history.map((m) => ({ role: m.role, content: m.content, kind: m.kind }))),
    );
  }, []);

  const refreshProfile = useCallback(async (id: string) => {
    setBundle(await fetchProfile(id));
  }, []);

  const run = useCallback(
    async (url: string, payload: Record<string, unknown>, userVisible: string) => {
      if (!learnerId || streaming) return;
      setStreaming(true);
      setMessages((prev) => [...prev, { role: "user", content: userVisible, kind: "chat" }, { role: "assistant", content: "", kind: "chat" }]);
      try {
        await streamPost(url, { learnerId, ...payload }, (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, content: last.content + chunk };
            return next;
          });
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `出错了：${detail}`, kind: "chat" };
          return next;
        });
      } finally {
        setStreaming(false);
        void refreshProfile(learnerId);
      }
    },
    [learnerId, refreshProfile, streaming],
  );

  const handleExplain = useCallback(
    (term: string, context: string) => {
      if (material.body && material.title) {
        void saveMaterial(learnerId, material);
      }
      void run("/api/explain", { term, context, materialTitle: material.title }, `我不懂这里：「${term}」`);
    },
    [learnerId, material, run],
  );

  const handleSend = useCallback((text: string) => void run("/api/chat", { message: text }, text), [run]);

  const handleProfileSave = useCallback(
    async (patch: Partial<Omit<LearnerProfile, "id" | "updatedAt">>) => {
      await saveProfilePatch(learnerId, patch);
      await refreshProfile(learnerId);
    },
    [learnerId, refreshProfile],
  );

  if (!bundle) {
    return <div className="flex h-screen items-center justify-center text-sm text-slate-500">加载中…</div>;
  }

  return (
    <main className="grid h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_320px]">
      <MaterialPanel material={material} onMaterialChange={setMaterial} onExplain={handleExplain} busy={streaming} />
      <ChatPanel messages={messages} streaming={streaming} onSend={handleSend} />
      <ProfilePanel
        profile={bundle.profile}
        facts={bundle.facts}
        concepts={bundle.concepts}
        engineLive={bundle.engineLive}
        onSave={handleProfileSave}
      />
    </main>
  );
}
