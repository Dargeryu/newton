"use client";

import type { ChatMessage, ConceptRecord, LearnerProfile, Material, ProfileFact } from "./types";

export interface ProfileBundle {
  profile: LearnerProfile;
  facts: ProfileFact[];
  concepts: ConceptRecord[];
  engineLive: boolean;
}

export function getLearnerId(): string {
  if (typeof window === "undefined") return "default";
  const existing = window.localStorage.getItem("learnmate:learnerId");
  if (existing) return existing;
  const id = `learner-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem("learnmate:learnerId", id);
  return id;
}

export async function fetchProfile(learnerId: string): Promise<ProfileBundle> {
  const response = await fetch(`/api/profile?learnerId=${encodeURIComponent(learnerId)}`);
  return (await response.json()) as ProfileBundle;
}

export async function saveProfilePatch(
  learnerId: string,
  patch: Partial<Omit<LearnerProfile, "id" | "updatedAt">>,
): Promise<LearnerProfile> {
  const response = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ learnerId, ...patch }),
  });
  const data = (await response.json()) as { profile: LearnerProfile };
  return data.profile;
}

export async function fetchMessages(learnerId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/messages?learnerId=${encodeURIComponent(learnerId)}`);
  const data = (await response.json()) as { messages: ChatMessage[] };
  return data.messages;
}

export async function fetchMaterials(learnerId: string): Promise<Material[]> {
  const response = await fetch(`/api/materials?learnerId=${encodeURIComponent(learnerId)}`);
  const data = (await response.json()) as { materials: Material[] };
  return data.materials;
}

export async function saveMaterial(
  learnerId: string,
  material: { title: string; kind: Material["kind"]; body: string; sourceUrl: string },
): Promise<Material> {
  const response = await fetch("/api/materials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ learnerId, ...material }),
  });
  const data = (await response.json()) as { material: Material };
  return data.material;
}

export async function streamPost(
  url: string,
  payload: unknown,
  onChunk: (text: string) => void,
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || `请求失败：${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    full += text;
    onChunk(text);
  }
  return full;
}

export function speak(text: string, lang = "zh-CN"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ""));
  utterance.lang = lang;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
