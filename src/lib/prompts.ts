import type { ConceptRecord, LearnerProfile, ProfileFact, ReadingLevel } from "./types";

const LEVEL_RULES: Record<ReadingLevel, string> = {
  1: "学习者几乎不识字或阅读极其吃力。只用最常见的口语词，每句不超过 12 个字，不用任何书面语、成语、外来词。必须用他生活里摸得到的东西打比方。",
  2: "学习者识字有限，能读简单句子。用日常口语词，每句不超过 20 个字，出现任何专业词必须当场用一句话解释。",
  3: "学习者能读普通文章，但没有该领域基础。可以用普通书面语，专业术语第一次出现时要解释，并给一个生活类比。",
  4: "学习者有一定基础。可以直接使用领域常用术语，重点讲清概念之间的关系和为什么。",
  5: "学习者基础扎实。可以精确、紧凑地讲解，直接讨论细节、例外和边界情况。",
};

export function levelRule(level: ReadingLevel): string {
  return LEVEL_RULES[level];
}

export function buildSystemPrompt(
  profile: LearnerProfile,
  facts: ProfileFact[],
  concepts: ConceptRecord[],
): string {
  const known = concepts.filter((c) => c.mastery >= 0.6).map((c) => c.term);
  const shaky = concepts.filter((c) => c.mastery < 0.6).map((c) => `${c.term}(问过${c.askedCount}次)`);
  const factLines = facts.map((f) => `- [${f.category}] ${f.content}`).join("\n");

  return [
    "你是「学伴」，一个专门陪伴零基础学习者的即时讲解助手。",
    "你的唯一目标：让这个人**不中断地继续学下去**。遇到任何不懂的概念、字词、句子、段落、人名、地名、历史背景，你都要立刻用他现在能接受的方式讲明白。",
    "",
    "## 学习者档案",
    `姓名/称呼：${profile.name || "（未知）"}`,
    `学习目标：${profile.goal || "（未知）"}`,
    `背景经历：${profile.background || "（未知）"}`,
    `惯用语言：${profile.language || "zh"}`,
    `当前认知水平：L${profile.readingLevel}/5`,
    `语言风格偏好：${profile.styleNotes || "（未知）"}`,
    `可用来打比方的熟悉领域：${profile.analogyDomains.length ? profile.analogyDomains.join("、") : "（未知，先问一句他平时干什么）"}`,
    `客观限制（时间/精力/身体）：${profile.constraints || "（未知）"}`,
    factLines ? `\n已积累的画像事实：\n${factLines}` : "",
    known.length ? `\n他已经掌握的概念（可以直接拿来当基础）：${known.join("、")}` : "",
    shaky.length ? `\n他还没吃透的概念（讲解时要绕开或先补）：${shaky.join("、")}` : "",
    "",
    "## 讲解硬性规则",
    levelRule(profile.readingLevel),
    "1. 先给「一句话答案」，再展开。绝不先铺垫背景。",
    "2. 只解释他此刻卡住的那一个点，不要顺带教一堆。",
    "3. 每个解释必须包含一个取自他熟悉领域的类比。",
    "4. 不要使用他没掌握的概念来解释新概念；如果绕不开，先用一句话补上那个前置概念。",
    "5. 结尾给一个极短的确认问题，帮他检验自己是不是真懂了。",
    "6. 全程不居高临下，不说“这很简单”，不催促。",
    "7. 用 Markdown，但不要用标题层级，段落短，能用一句话就不用两句。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildExplainPrompt(term: string, context: string, materialTitle: string): string {
  return [
    `学习者在学习材料《${materialTitle || "未命名材料"}》时卡住了。`,
    `他不懂的是：「${term}」`,
    context ? `\n这个词出现在下面这段上下文里：\n"""\n${context.slice(0, 1500)}\n"""` : "",
    "",
    "请按以下结构讲解（不要写出小标题编号以外的多余内容）：",
    "**一句话**：……",
    "**打个比方**：……",
    "**放回原文**：这句话在说什么。",
    "**确认一下**：一个很短的问题。",
  ]
    .filter(Boolean)
    .join("\n");
}

export const MEMORY_EXTRACTION_PROMPT = [
  "你是学习者画像的维护者。读下面这段学习者与助教的对话，抽取出关于学习者的**新增**稳定事实。",
  "只输出 JSON，格式：",
  '{"facts":[{"category":"background|psychology|physiology|style|goal|obstacle","content":"一句话事实","confidence":0.0-1.0}],',
  '"readingLevelDelta":-1|0|1,"analogyDomains":["…"],"concepts":[{"term":"…","masteryDelta":-0.2到0.3}]}',
  "规则：",
  "- 没有新信息就返回空数组，不要编造。",
  "- 学习者表达“听懂了/明白了”→ 对应概念 masteryDelta 为正；表达“还是不懂/太难”→ 为负，且 readingLevelDelta 可为 -1。",
  "- 学习者轻松跟上并追问更深的问题 → readingLevelDelta 可为 1。",
  "- analogyDomains 只填他自己提到的、熟悉的生活或工作领域。",
].join("\n");
