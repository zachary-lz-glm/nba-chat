# NBA Chat Courtside Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent visual styling task; execute shared data and integration tasks in this session. Steps use checkbox syntax.

**Goal:** Implement the approved courtside design as a responsive, factual NBA question-answering experience.

**Architecture:** Reuse the existing tool loop. Add validated client view models and a read-only schedule endpoint. Derive single-game context from the current session's messages, never global persisted state. Tool output drives cards and timeline; free-form Markdown remains available.

**Tech Stack:** Existing Next.js 16, React 19, AI SDK 7, Zod, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-courtside-redesign.md`

## Global Constraints

No invented facts, no supplier/API/field names in normal UI, Beijing dates, no new framework, no automatic publish. Preserve existing chat/session/IME/stop/error functionality. Accessible keyboard controls and reduced-motion behavior.

## Task 1: Validate view models and schedule input

Files: create `src/lib/client/basketball.ts`, `basketball.test.ts`, `src/app/api/games/route.ts`, `route.test.ts`.

Interfaces: `GameCard`, `gameSchema`, `readBasketball(parts)`, `findCurrentGame(messages)`, `teamName(abbr, fallback)`, `gameQuestion(game, intent)`, `statusLabel(status)`; API returns `{ date, games, fetchedAt }` and errors return 400/503.

- [x] Write tests for malformed tool results, multiple-game ambiguity, current single-game context, quarter/overtime labels, explicit date/team questions, and invalid dates.
- [x] Run focused tests and observe failure from missing implementation.
- [x] Implement schemas and result extraction using only successful tool results; match play tool input to the game. Validate real calendar dates before external queries.
- [x] Verify focused tests and existing suite.

## Task 2: Visual system

Files: modify `src/app/globals.css`; add locally stored `public/courtside-arena.webp`.

Interfaces: retain current component classes and add `courtside-*` classes specified in the task brief. No JSX changes by visual worker.

- [x] Generate a reusable arena photograph without text, logos, people or scoreboard; store a compressed local WebP.
- [x] Apply navy/ivory/red tokens, editorial hero, schedule strips, compact context bar, data cards and timeline; preserve dialogs/drawers and Markdown styles.
- [x] Inspect desktop 1440px, mobile 390px, narrow mobile 320px; correct overlap, focus and reduced motion.

## Task 3: Home and conversational components

Files: add `src/components/home/CourtsideHome.tsx`, `src/components/chat/GameCard.tsx`, `GameContext.tsx`, `FollowUps.tsx`; modify `page.tsx`, `Composer.tsx`, `ChatMessage.tsx`, `DataCards.tsx`, `ToolStrip.tsx`, `Icon.tsx`.

Consumes Task 1 view models. Homepage calls `/api/games?date=YYYY-MM-DD` without model inference. `onAsk(text)` callbacks drive existing send flow. `GameContext` derives from current messages; card actions use explicit game date/team.

- [x] Implement schedule tabs, abortable fetch and honest loading/error/empty states; hero composer replaces empty-state bottom composer.
- [x] Render actual game data and explicit current-game context. Add scoped follow-ups and record timeline, with expansion for more than six records.
- [x] Retain existing stop, retry, session, IME and settings features; display last-answer follow-ups only when not streaming.
- [x] Run type check, lint and tests; browser-check seeded tool-result sessions and intercepted schedule errors.

## Task 4: Validation and delivery

Files: update this plan and project README with verified functionality.

- [x] Run tests, lint and production build, fix observed failures.
- [x] Capture desktop and mobile screenshots; verify no horizontal overflow and all visible navigation/actions.
- [x] Review diff for factual labeling, context leakage, double input boxes, repeated data and broken interactions.
- [x] Commit verified work on `codex/courtside-redesign`, transfer the verified changes into the user's source directory on a separate review branch, leave online deployment for explicit authorization.

## 验证记录

2026-10-10：全套 65 项测试通过，修改的界面与新增接口通过 lint；生产构建通过。隔离浏览器验证真实赛程、历史回合数据、会话上下文、错误与空状态，以及 1440/390/320px 布局。独立审查修复跨消息恢复比赛、工具结果先后顺序、精确时间范围和追问上下文。全仓库已有的 47 项 any lint 错误未扩大本次范围。部署保留原线上版本。

用户源码目录默认 Turbopack 正式构建及 TypeScript 检查通过。真实模型浏览器联调通过界面链路，但复现旧问答层在仅查赛果后生成未查证球员统计；不将该联调计为事实准确性验证通过，未修改模型或提示词。

## 交付复查补充

2026-10-10：按用户要求将默认入口调整为今天。修复比赛阶段与查询入口不一致、手机缺少历史会话入口及单场统计漏查。新增意图查询完整性检查，纯单场统计使用校验后的工具结果生成正文。77 项测试、独立 lint、生产构建通过；真实模型查询抢七两队统计表与工具数据一致。全量 31 题评测未重跑，开放式分析不作事实完全准确承诺。用户此前已授权部署，同一交付继续更新生产。
