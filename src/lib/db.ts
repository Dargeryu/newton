import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ChatMessage, ConceptRecord, LearnerProfile, Material, ProfileFact, ReadingLevel } from "./types";

const DATA_DIR = process.env.LEARNMATE_DATA_DIR ?? path.join(process.cwd(), "data");

let db: Database.Database | null = null;

function connect(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const handle = new Database(path.join(DATA_DIR, "learnmate.db"));
  handle.pragma("journal_mode = WAL");
  handle.exec(`
    CREATE TABLE IF NOT EXISTS learners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL DEFAULT '',
      background TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'zh',
      reading_level INTEGER NOT NULL DEFAULT 2,
      style_notes TEXT NOT NULL DEFAULT '',
      analogy_domains TEXT NOT NULL DEFAULT '[]',
      constraints TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.6,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id TEXT NOT NULL,
      term TEXT NOT NULL,
      mastery REAL NOT NULL DEFAULT 0.2,
      asked_count INTEGER NOT NULL DEFAULT 1,
      last_explanation TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE (learner_id, term)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'chat',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      body TEXT NOT NULL,
      source_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
  db = handle;
  return handle;
}

interface LearnerRow {
  id: string;
  name: string;
  goal: string;
  background: string;
  language: string;
  reading_level: number;
  style_notes: string;
  analogy_domains: string;
  constraints: string;
  updated_at: string;
}

function toProfile(row: LearnerRow): LearnerProfile {
  let analogyDomains: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.analogy_domains);
    if (Array.isArray(parsed)) analogyDomains = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    analogyDomains = [];
  }
  const level = Math.min(5, Math.max(1, Math.round(row.reading_level))) as ReadingLevel;
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    background: row.background,
    language: row.language,
    readingLevel: level,
    styleNotes: row.style_notes,
    analogyDomains,
    constraints: row.constraints,
    updatedAt: row.updated_at,
  };
}

export function getProfile(learnerId: string): LearnerProfile {
  const handle = connect();
  const row = handle.prepare("SELECT * FROM learners WHERE id = ?").get(learnerId) as LearnerRow | undefined;
  if (row) return toProfile(row);
  const now = new Date().toISOString();
  handle
    .prepare("INSERT INTO learners (id, updated_at) VALUES (?, ?)")
    .run(learnerId, now);
  const created = handle.prepare("SELECT * FROM learners WHERE id = ?").get(learnerId) as LearnerRow;
  return toProfile(created);
}

export function saveProfile(learnerId: string, patch: Partial<Omit<LearnerProfile, "id" | "updatedAt">>): LearnerProfile {
  const handle = connect();
  const current = getProfile(learnerId);
  const next: LearnerProfile = { ...current, ...patch, id: learnerId, updatedAt: new Date().toISOString() };
  handle
    .prepare(
      `UPDATE learners SET name = ?, goal = ?, background = ?, language = ?, reading_level = ?,
       style_notes = ?, analogy_domains = ?, constraints = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      next.name,
      next.goal,
      next.background,
      next.language,
      next.readingLevel,
      next.styleNotes,
      JSON.stringify(next.analogyDomains),
      next.constraints,
      next.updatedAt,
      learnerId,
    );
  return next;
}

export function addFact(learnerId: string, category: ProfileFact["category"], content: string, confidence = 0.6): void {
  const handle = connect();
  const exists = handle
    .prepare("SELECT id FROM profile_facts WHERE learner_id = ? AND content = ?")
    .get(learnerId, content);
  if (exists) return;
  handle
    .prepare("INSERT INTO profile_facts (learner_id, category, content, confidence, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(learnerId, category, content, confidence, new Date().toISOString());
}

export function listFacts(learnerId: string, limit = 40): ProfileFact[] {
  const handle = connect();
  const rows = handle
    .prepare("SELECT * FROM profile_facts WHERE learner_id = ? ORDER BY id DESC LIMIT ?")
    .all(learnerId, limit) as Array<{
    id: number;
    learner_id: string;
    category: ProfileFact["category"];
    content: string;
    confidence: number;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    category: row.category,
    content: row.content,
    confidence: row.confidence,
    createdAt: row.created_at,
  }));
}

export function upsertConcept(learnerId: string, term: string, explanation: string, masteryDelta: number): void {
  const handle = connect();
  const now = new Date().toISOString();
  const row = handle
    .prepare("SELECT mastery, asked_count FROM concepts WHERE learner_id = ? AND term = ?")
    .get(learnerId, term) as { mastery: number; asked_count: number } | undefined;
  if (!row) {
    handle
      .prepare(
        "INSERT INTO concepts (learner_id, term, mastery, asked_count, last_explanation, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      )
      .run(learnerId, term, Math.min(1, Math.max(0, 0.2 + masteryDelta)), explanation, now);
    return;
  }
  handle
    .prepare(
      `UPDATE concepts SET mastery = ?, asked_count = ?, last_explanation = ?, updated_at = ?
       WHERE learner_id = ? AND term = ?`,
    )
    .run(
      Math.min(1, Math.max(0, row.mastery + masteryDelta)),
      row.asked_count + 1,
      explanation,
      now,
      learnerId,
      term,
    );
}

export function listConcepts(learnerId: string, limit = 60): ConceptRecord[] {
  const handle = connect();
  const rows = handle
    .prepare("SELECT * FROM concepts WHERE learner_id = ? ORDER BY updated_at DESC LIMIT ?")
    .all(learnerId, limit) as Array<{
    id: number;
    learner_id: string;
    term: string;
    mastery: number;
    asked_count: number;
    last_explanation: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    term: row.term,
    mastery: row.mastery,
    askedCount: row.asked_count,
    lastExplanation: row.last_explanation,
    updatedAt: row.updated_at,
  }));
}

export function addMessage(learnerId: string, role: ChatMessage["role"], content: string, kind: ChatMessage["kind"]): void {
  connect()
    .prepare("INSERT INTO messages (learner_id, role, content, kind, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(learnerId, role, content, kind, new Date().toISOString());
}

export function listMessages(learnerId: string, limit = 40): ChatMessage[] {
  const handle = connect();
  const rows = handle
    .prepare("SELECT * FROM (SELECT * FROM messages WHERE learner_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC")
    .all(learnerId, limit) as Array<{
    id: number;
    learner_id: string;
    role: ChatMessage["role"];
    content: string;
    kind: ChatMessage["kind"];
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    role: row.role,
    content: row.content,
    kind: row.kind,
    createdAt: row.created_at,
  }));
}

export function addMaterial(
  learnerId: string,
  title: string,
  kind: Material["kind"],
  body: string,
  sourceUrl: string,
): Material {
  const handle = connect();
  const now = new Date().toISOString();
  const info = handle
    .prepare("INSERT INTO materials (learner_id, title, kind, body, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(learnerId, title, kind, body, sourceUrl, now);
  return {
    id: Number(info.lastInsertRowid),
    learnerId,
    title,
    kind,
    body,
    sourceUrl,
    createdAt: now,
  };
}

export function listMaterials(learnerId: string, limit = 20): Material[] {
  const handle = connect();
  const rows = handle
    .prepare("SELECT * FROM materials WHERE learner_id = ? ORDER BY id DESC LIMIT ?")
    .all(learnerId, limit) as Array<{
    id: number;
    learner_id: string;
    title: string;
    kind: Material["kind"];
    body: string;
    source_url: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    title: row.title,
    kind: row.kind,
    body: row.body,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
  }));
}
