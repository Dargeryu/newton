# 学伴 (learnmate)

面向零基础 / 低识字水平学习者的 AI 即时讲解助手。学习者在看视频、听音频、读文章的过程中随时卡住，选中看不懂的内容即可得到用他能接受的方式给出的解释，难度和语言风格会随对话持续自适应。

## 核心机制

1. **学习者画像层**（`src/lib/db.ts`）：背景经历、学习目标、认知水平 L1–L5、语言风格偏好、可用于打比方的熟悉领域、时间/精力/身体限制。
2. **即时讲解引擎**（`src/lib/prompts.ts` + `src/app/api/explain`）：拿到卡点词 + 原文上下文 + 画像 + 已掌握/未掌握概念，生成「一句话 / 打个比方 / 放回原文 / 确认一下」四段式解释，禁止用学习者尚未掌握的概念去解释新概念。
3. **动态迭代层**（`src/lib/memory.ts`）：每轮对话后由模型抽取新的画像事实、概念掌握度变化和认知水平升降，写回数据库；也用关键词启发式兜底（例如「还是不懂」直接降一级）。
4. **多媒介**：文字贴入、字幕文件（.srt/.vtt）导入、视频链接内嵌（YouTube / B 站）、浏览器语音输入与朗读。

## 运行

```bash
npm install
export OPENAI_API_KEY=sk-...      # 不设置则进入演示（mock）模式
npm run dev                        # http://localhost:3000
```

可选环境变量：

- `LEARNMATE_MODEL`：默认 `gpt-4o-mini`
- `LEARNMATE_DATA_DIR`：SQLite 数据目录，默认 `./data`

## 结构

```
src/lib/llm.ts        可插拔模型引擎（OpenAI / mock）
src/lib/prompts.ts    系统提示词与分级讲解规则
src/lib/memory.ts     画像与掌握度的持续更新
src/lib/db.ts         SQLite 持久化
src/app/api/*         chat / explain / profile / materials / messages
src/app/learn         三栏工作台：材料 · 对话 · 画像
```

## 当前限制

- 视频/音频不做自动转写，需要贴字幕或文本；接入 Whisper 即可补齐。
- 单用户本地 SQLite，无鉴权，适合原型验证。
