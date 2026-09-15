export type ReadingLevel = 1 | 2 | 3 | 4 | 5;

export interface LearnerProfile {
  id: string;
  name: string;
  goal: string;
  background: string;
  language: string;
  readingLevel: ReadingLevel;
  styleNotes: string;
  analogyDomains: string[];
  constraints: string;
  updatedAt: string;
}

export interface ProfileFact {
  id: number;
  learnerId: string;
  category: "background" | "psychology" | "physiology" | "style" | "goal" | "obstacle";
  content: string;
  confidence: number;
  createdAt: string;
}

export interface ConceptRecord {
  id: number;
  learnerId: string;
  term: string;
  mastery: number;
  askedCount: number;
  lastExplanation: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  learnerId: string;
  role: "user" | "assistant";
  content: string;
  kind: "chat" | "explain";
  createdAt: string;
}

export interface Material {
  id: number;
  learnerId: string;
  title: string;
  kind: "text" | "transcript" | "video";
  body: string;
  sourceUrl: string;
  createdAt: string;
}
