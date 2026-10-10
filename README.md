# NBA Chat

NBA 官方风格的中文智能问答助手(笔试题交付)。打开即问:赛程赛果、球员数据、逐回合关键球、排名、历史背景——通过工具查询赛程与统计；单场球员统计直接展示经过校验的查询结果。

**在线体验:<https://nba-chat.vercel.app>**(站方已预置模型服务,无需任何配置;大陆网络访问 vercel.app 需自备代理)

方案说明(思路 / 架构 / 数据实测 / 成本核算 / 取舍)见 [`docs/方案说明.pdf`](docs/方案说明.pdf)。

## 功能特性

- **场边看球体验**：深海军蓝、暖白和 NBA 红的编辑式首页，今日 / 昨日 / 经典比赛赛程；北京时间日期与真实赛事结果，加载失败与暂无比赛分别提示。
- **比赛内追问**：当前比赛上下文、两队主要球员统计、关键回合时间线、完整记录展开与逐回合追问；新会话清除比赛上下文。数据卡片只接受校验通过的工具结果。

- **事实可靠**:10 个数据工具实时查证 ESPN 公开 JSON 与中文维基;提示词级「事实纪律」——客观事实一律来自工具,记忆与工具冲突以工具为准,查不到如实说「暂无数据」
- **多步推理**:多步工具循环(≤16 步),支持系列赛逐场核对、事件倒查(「上次夺冠」「最近一次 G7」)、用户前提纠偏
- **合规兜底**:六类红线话题(政治地缘/隐私绯闻/司法/黑哨阴谋/博彩/侮辱性绰号)先拒答、不检索,含包装变体拦截
- **三档模型切换**:站方默认 qwen-plus / 站方自选(qwen-flash·plus·max)/ BYOK(任意 OpenAI 兼容服务);设置面板一键切换并测试连接
- **体验细节**:流式输出、工具调用过程可视化(「正在查证 6 月 23 日赛程…」)、多会话管理(localStorage 持久化)、Markdown 表格渲染、中文输入法回车保护、停止/重新生成、移动端适配
- **时区严谨**:北京日历日 → 美东日期区间 → UTC 时间戳回滤的三级换算;季前赛/常规赛/季后赛/休赛期动态口径;进行中场次明确标注

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js 16(App Router)+ React 19 + TypeScript + Tailwind CSS 4 |
| AI | Vercel AI SDK(`ai` v7 + `@ai-sdk/openai-compatible`)→ 阿里云百炼 compatible-mode(qwen 系列) |
| 数据 | ESPN 公开 JSON 端点(服务端取数)+ 中文维基百科;压缩层 500KB+ → 1-8KB |
| 部署 | Vercel Hobby(免费档,Serverless);无数据库,会话存浏览器 localStorage |
| 测试 | vitest(77 项单测:时间换算/赛季计算/压缩/工具层/模型解析/界面数据与比赛上下文/赛程入口) |

## 本地开发

```bash
npm install
```

配置环境变量 `.env.local`(站方模型服务 key,[阿里云百炼](https://bailian.console.aliyun.com/)可免费申请):

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxx
# 可选:覆盖站方默认模型(默认 qwen-plus)
# NBA_MODEL=qwen-plus
```

启动:

```bash
npm run dev
# 打开 http://localhost:3000
```

> 不配置 `DASHSCOPE_API_KEY` 也能启动:在页面右上角设置面板选择 BYOK 档,填入任意 OpenAI 兼容服务的接口地址/模型/Key(仅存浏览器 localStorage)。

## 测试

```bash
npm test   # vitest,77 项
```

线上 31 题评测记录(含逐题档位、修补回路、A/B 对照、时延)见 [`scripts/eval-results.md`](scripts/eval-results.md),题目清单见 `scripts/eval-questions.md`。

本次场边设计方案与实施记录见 `docs/superpowers/specs/2026-10-10-courtside-redesign.md` 和 `docs/superpowers/plans/2026-10-10-courtside-redesign.md`。球场背景 `public/courtside-arena.webp` 与篮球缩略图 `public/courtside-ball.webp` 为依据设计稿重建的 AI 氛围图，不代表某场真实赛事。球队标识来自 NBA 官方球队页对应的公开 CDN，保存在 `public/teams/`；标题使用 Noto Sans SC Heavy 字符子集，许可随字体保存在 `public/fonts/`。

本次验证覆盖 1440px 桌面、390px / 320px 手机，真实赛程读取、时间线展开 / 收起 / 追问、会话切换、设置关闭、错误及空数据状态。完整旧版 31 题模型评测未重新执行。全仓库 lint 仍有基线已有的 47 项 `no-explicit-any` 错误；本次新增及修改的代码通过独立 lint 检查。

交付复查修复了单场统计只查赛果的漏查问题：统计意图继续查询技术统计，复盘意图继续查询技术统计与逐回合记录。纯单场球员统计正文由校验后的工具结果生成。真实默认模型联调确认总决赛抢七两队统计表与查询数据一致（亚历山大 29 分 / 5 篮板 / 12 助攻）；这项验证不代表开放式分析或全部 31 题事实准确性均已通过。

## 部署(Vercel)

1. Fork / 导入本仓库到 Vercel,环境变量填 `DASHSCOPE_API_KEY`(可选 `NBA_MODEL`)
2. `npm run build` 通过即可部署,无需其他配置

> 本仓库实测注意:若 Vercel 项目开启了 Trusted Authors 保护,`vercel --prod` 直接部署会被 commit author 权限拦截。解决办法是从**无 `.git` 的副本目录**执行部署(构建产物不受影响),或由项目 owner 账号操作。

## 目录结构

```
src/
  app/
    page.tsx                  # 聊天主界面
    api/chat/route.ts         # 对话入口:系统提示注入 + 工具循环(≤16 步)+ 限流
    api/test-connection/      # 设置面板「测试连接」
  components/
    chat/                     # 消息流/输入框/工具状态条
    sessions/                 # 会话抽屉(新建/切换/删除)
    settings/                 # 设置面板(三档模型切换)
  lib/
    ai/                       # prompt.ts(系统提示)tools.ts(10 工具)model.ts(三档解析)
    espn/                     # ESPN 客户端 + 压缩(scoreboard/summary/players/standings/news/wiki)
    time.ts                   # 北京↔美东↔UTC 换算、赛季计算
    rl.ts                     # 每 IP 限流(12 req/min,内存级尽力而为)
scripts/
  eval-questions.md           # 评测题目清单(31 问)
  eval-results.md             # 评测结果与修补记录
docs/
  方案说明.md / .html / .pdf  # 方案说明(交付物)
```

## 已知限制

- vercel.app 域名在大陆网络需代理访问(可用本地 `npm run dev` 替代验证)
- 限流为 Serverless 实例内存级,多实例下仅尽力而为
- 开放式分析仍可能夹带未查证的事实；更换模型不构成准确性保证。纯单场球员统计已绑定查询数据，完整 31 题评测仍需重跑。

## 设计稿对齐（2026-10-10）

以用户提供的桌面与手机参考图重新对齐：满幅球场背景、悬浮比分卡、深色输入框和红色发送按钮、横向比赛卡与查询入口。首页默认展示北京时间今天，昨天和经典比赛可切换；首页优先展示进行中的比赛，其次是即将开赛的比赛，直播比分每 30 秒刷新。手机端使用顶部比分卡、红色问题气泡和上半场 / 第三节 / 末节逐段查询。比分卡依据查询结果显示，不为还原图形填造数据。背景照片为重建素材，不承诺摄影细节逐像素相同。

## 交付复查（2026-10-10）

未开赛显示球队近况与赛前看点，进行中显示实时战况，已结束显示复盘与最后两分钟；延期与取消不会显示胜负分析或伪比分。手机更多菜单支持新建会话、历史对话和设置，并支持 Escape 关闭与焦点恢复。日期标签支持方向键切换。77 项单测、生产构建、真实赛程和默认模型单场统计联调通过；桌面与 320 / 390 / 768 / 900 / 1024px 布局、空数据与失败状态已验证。
