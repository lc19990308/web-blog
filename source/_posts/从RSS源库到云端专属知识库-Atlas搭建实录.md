---
title: "从RSS源库到云端专属知识库：Atlas 搭建实录"
date: 2026-08-06
categories: "AI"
description: "把 2000 个 RSS 订阅源搭建成自己的线上知识库：Supabase + Vercel + GitHub Actions + DeepSeek 架构、四层数据设计、智能体 API，以及部署路上踩过的十几个坑"
tags: ["AI", "RSS", "知识库", "RAG"]
copyright: true
---

## 前言

我平时靠 RSS 订阅源跟踪技术圈和金融信息，但订阅源是一回事，**能检索、能沉淀、能被我自己的智能体调用**的知识库又是另一回事。GitHub 上 [xiangyugongzuoliu/awesome-rss-feeds-list](https://github.com/xiangyugongzuoliu/awesome-rss-feeds-list) 这个仓库收集了约 2,000 个有效 RSS 源、30 个分类 OPML——源是现成的，缺的是一个把它们变成"我的专属线上知识库"的方案。

这篇文章记录我从 0 到 100 的完整过程：架构选型、数据设计、云端部署、智能体接入，以及部署路上踩过的十几个坑。项目代号 **Atlas**（Atlas RSS Knowledge Base），最终跑在 Supabase + Vercel + GitHub Actions 上，完全云端托管，本地智能体通过受保护的 API 访问。

---

## 0%：需求——为什么要把 RSS 源库变成知识库

### 三个硬约束

开始动手前，先明确需求边界：

1. **不部署到本地**：不想在家里的机器上常驻任何服务，关机后抓取、归档和网页访问仍要正常运行
2. **线上可维护**：要有独立的第三方平台托管，不是跑在我电脑上的 demo
3. **本地智能体可接入**：我的 Codex/Claude 等本地智能体要通过数据管道拿到这些数据

### 为什么不全量抓取 2,000 个源

仓库里源很多，但**不是越多越好**。全量抓取的问题：

- 大量源是 X/Twitter 的 RSS 代理路由，极不稳定（后面真的踩到了）
- 抓取量、存储量、向量化成本随源数量线性上涨
- 真正每天会读、会检索的源，其实就几十个

所以第一期策略：**从重点领域选 50~100 个源**（AI、开发工具、研究、中文随笔、创业），试运行两周后再依据命中率扩容。

### 四层数据设计

知识库的核心不是"存文章"，而是把数据分层，每层职责单一：

| 层 | 内容 | 用途 |
|:---|:-----|:-----|
| 源目录 | 上游 OPML、分类、启用状态 | 可追溯地维护订阅范围 |
| 原始层 | 每次 RSS 返回的 XML/HTML 快照 | 保留证据，可重新解析 |
| 文章层 | 标题、正文、链接、发布时间、去重哈希 | 在线浏览、筛选与归档 |
| 知识层 | 摘要、标签、向量、个人批注、关联主题 | 语义检索与问答 |

关键原则：**原始抓取内容永远保留，不被摘要覆盖**。摘要、标签、向量都是可再生的派生层，原始快照是不可再生的证据层。

---

## 20%：架构选型——拒绝本地部署

### 方案对比

| 方案 | 优点 | 缺点 |
|:-----|:-----|:-----|
| 本地部署（RSSHuginn/自建） | 完全可控 | 需要常驻服务、公网暴露、维护成本高 ❌ |
| 纯第三方托管 | 零运维 | 数据不在自己手里、定制受限 |
| 托管数据库 + 无服务器 + 定时同步 ✅ | 免费额度起步、可扩展、数据自主 | 需要配多个平台 |

最终选型：

```
GitHub RSS 源库
  → 定时同步与抓取（GitHub Actions）
  → Supabase（文章、原始内容、标签、向量、检索）
  → Vercel（线上知识库网页 + 私有 API）
  → 本地 Codex/智能体（HTTPS 调用）
```

### 各组件职责

| 职责 | 平台 | 说明 |
|:-----|:-----|:-----|
| 数据库、向量检索、登录 | **Supabase** | PostgreSQL + pgvector + Storage + RLS（行级安全） |
| 知识库网页、私有 API | **Vercel** | Next.js 无服务器部署，无需维护主机 |
| 定时抓取和同步 | **GitHub Actions** | 每 4 小时增量抓取，每天同步上游 OPML |
| 中文富化 | **DeepSeek** | 标题、摘要、正文、主题、标签的生成 |
| 语义向量（可选） | **Qdrant Cloud** | 未配置时回退 pgvector 兼容路径 |
| 原始快照（可选） | **Cloudflare R2** | 未配置时回退私有 Storage bucket |

### 两个"可选项"的哲学

架构里有几处"可选、未配置时自动回退"的设计（R2、Qdrant、Embeddings），这不是偷懒，而是**渐进增强**：

- 没有向量服务时，用中文标题、摘要、主题、标签做关键词检索，正文仍可打开
- 配置向量服务后，手动运行 `backfill_embeddings` 小批次补向量，可重复触发
- 每个可选组件失败都不影响核心链路

---

## 30%：实施计划——六期交付

计划收敛为 6 期，每期半天到两天：

| 期 | 内容 | 时长 |
|:--:|:-----|:----:|
| 1 | 基础与数据模型：建仓库、Supabase、Vercel，建 7 张核心表 | 1 天 |
| 2 | 订阅目录与首批入库：导入 OPML，选 50~100 源，按 GUID/URL/哈希去重 | 1 天 |
| 3 | 自动化管道：GitHub Actions 抓取增量、失败重试、状态记录 | 1~2 天 |
| 4 | 线上知识库网页：私有登录、筛选、混合搜索、收藏、笔记 | 1~2 天 |
| 5 | 本地智能体接入：受 token 保护的 API，4 个 REST 操作 | 1 天 |
| 6 | 验收与运营：10 个真实问题验证、告警、备份、token 轮换 | 半天 |

**完成标准**（验收时逐条核对）：

- 线上地址可登录访问，且只有我能访问内容
- 选定源每 4 小时自动更新，失败有记录与告警
- 本地智能体可检索并获得带原文链接的证据
- 删除摘要、标签或向量不影响原始文章快照
- 订阅源从 50~100 起步，稳定后再扩容

---

## 40%：数据模型——15 个迁移文件

数据库是知识库的骨架，最终沉淀了 **15 个 SQL 迁移**（`supabase/migrations/0001~0015`）：

```text
0001_atlas.sql                          基础表：feeds/articles/chunks/notes/ingestion_runs
0002_bookmarks.sql                      收藏与书签
0003_service_role_grants.sql            服务端角色表权限（后面踩坑补的）
0004_realtime_chinese_pipeline.sql      中文检索索引（中文标题/摘要/标签）
0005_governance_dashboard.sql           治理仪表盘（来源信誉、健康状态）
0006_ingestion_throughput.sql           抓取吞吐控制
0007_prioritize_realtime_enrichment.sql 新文章优先富化
0008_queue_claim_performance.sql        调度队列领取性能
0009_article_quality_gate.sql           正文质量闸门
0010_storage_efficiency.sql             存储效率
0011_source_quality_governance.sql      来源质量治理
0012_document_intake_and_capacity.sql   文档摄入与容量熔断
0013_fix_source_quality_recalculation.sql   修正来源质量重算
0014_fix_source_quality_inner_aliases.sql   修正来源质量联表别名
0015_quality_checked_agent_search.sql   带质量检查的智能体检索
```

### 核心表设计

```sql
-- 订阅源（带治理元数据）
feeds(
  id, feed_url UNIQUE, homepage_url, category, language,
  enabled BOOLEAN,             -- 手动停用后不被目录刷新重新开启
  trust_level,                 -- 人工信任/限制策略
  health_score,                -- 最近 30 天、最多 100 个观测计算
  fetch_interval_minutes
)

-- 文章（去重注册表）
articles(
  id, feed_id FK, title, content, url,
  published_at,
  dedup_hash UNIQUE,           -- feed URL + guid/link + 内容哈希
  status                     -- source_audit / candidate / published
)

-- 原始快照（证据层）
rss_raw_snapshots(id, feed_id, raw_xml, fetched_at)  -- 永不删除

-- 知识层
article_chunks(id, article_id FK, content, embedding VECTOR(1536))
notes(id, title, body, tags)  -- 个人笔记
```

### 去重是硬要求

同一条新闻可能来自多个订阅源，用 `feed URL + guid/link + 内容哈希` 三元组去重，避免同文多源重复入库。

---

## 50%：云端部署——Supabase + Vercel

### Supabase 初始化

1. 新建 Supabase 项目，启用 **Email OTP 登录**（不需要密码）
2. 在 Authentication -> URL Configuration 加入 Vercel 域名到 Redirect URLs
3. 按顺序运行 15 个迁移
4. 复制 Project URL、anon key 和 service role key

**密钥纪律（最重要的一条）**：

```text
NEXT_PUBLIC_SUPABASE_URL        → 浏览器可用（构建时注入 JS）
NEXT_PUBLIC_SUPABASE_ANON_KEY   → 浏览器可用（登录用）
SUPABASE_SERVICE_ROLE_KEY       → 只放 Vercel 和 GitHub Secrets，绝不进浏览器或代码库
```

### Vercel 部署

将项目推送到私有 GitHub 仓库，在 Vercel 导入，配置环境变量后 `npm run build`。关键变量：

| 变量 | 用途 |
|:-----|:-----|
| `APP_OWNER_EMAIL` | 唯一允许网页登录的邮箱 |
| `AGENT_API_TOKEN` | 本地智能体访问令牌 |
| `DEEPSEEK_API_KEY` / `BASE_URL` / `MODEL` | 中文富化（默认 deepseek-v4-flash） |
| `EMBEDDING_*`（可选） | 独立的 OpenAI 兼容嵌入服务，必须产出 1,536 维向量 |
| `R2_*`、`QDRANT_*`（可选） | R2 快照与 Qdrant 向量 |

---

## 60%：抓取管道——GitHub Actions 每小时领任务

### 工作流设计（rss-ingestion.yml）

GitHub Actions 承担全部定时抓取，本机零常驻：

- **每小时**：以单个小批次领取到期来源
- **每天**：刷新一次上游 OPML 目录（新源进候选池，不自动订阅）
- **手动触发**：`import_catalog` 导入目录、`backfill_embeddings` 补向量

### 抓取流水线

```
领取到期源
  → 抓取 RSS（原始快照进 R2/私有 Storage）
  → 判断是否取得可阅读正文
      ├─ 只有标题/链接 → 保留为来源审计记录，不进资料库
      └─ 有正文 → 正文评分 → 来源信誉 → 跨源去重 → 成为正式文章
  → DeepSeek 中文富化（标题、摘要、正文、主题、标签）
  → 新文章优先富化，历史回填手动小批次
```

### 正文质量闸门

不是每条 RSS 都能当文章：**只有标题、链接、得分或评论数的条目会保留为来源审计记录，但不会进入资料库、中文富化、搜索、日报或知识图谱**。这个闸门保证了知识库里只有"能读的正文"，没有"只有标题的空壳"。

### 版权与反爬纪律

- 遇到登录墙、反爬或超时则保留 RSS 内容，**不绕过站点限制**
- 版权敏感网站默认只保存 RSS 已提供的内容、摘要和原始链接
- 全文抓取仅对明确允许的站点启用

---

## 70%：智能体 API——让本地智能体接入

### 四个 REST 操作

所有接口要求 `Authorization: Bearer $AGENT_API_TOKEN`：

| 接口 | 作用 |
|:-----|:-----|
| `GET /api/v1/search?q=xxx&limit=10` | 语义召回 + 中文词面匹配 + 重排（无向量时降级关键词） |
| `GET /api/v1/articles/:id` | 中文正文、来源、原文证据、原始快照路径 |
| `GET /api/v1/briefing?hours=24` | 指定时间窗的增量文章（日报素材） |
| `POST /api/v1/notes` | 智能体写入个人笔记 |

写入笔记示例：

```bash
curl -X POST "https://your-atlas.vercel.app/api/v1/notes" \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"RAG 评估线索","body":"优先检查引用可验证性。","tags":["RAG","待跟进"]}'
```

### 令牌边界

- 本地智能体**只持有** `AGENT_API_TOKEN`，不持有 Supabase service role key
- token 独立、可撤销、可轮换
- 检索结果固定返回出处、链接和发布时间，保证智能体回答可追溯

### 扩展为 MCP 工具

这四个接口可以进一步包装为远程 MCP 工具：`search_knowledge`、`get_article`、`list_recent_articles`、`save_note`。之后本地智能体说"查最近两周 RAG 的新进展并列出原文依据"，就会从云端库检索，而不是依赖公共搜索。

---

## 80%：踩坑合集（上）——密钥与权限

部署过程踩了十几个坑，按"根因类别"整理。先是**密钥与权限类**：

### 坑 1：GitHub Actions 读不到 Supabase 密钥

症状：工作流跑起来就是 `SUPABASE_URL` 缺失。
排查：不是数据库迁移失败，是 **Secrets 没注入**。需要在 GitHub 仓库 Settings -> Secrets and variables -> Actions 里单独配置，`Supabase URL` 与密钥是两处独立的配置。

### 坑 2：后台抓取代码错误地要求浏览器 anon key

症状：拿到了 URL 和 service role key，仍报"缺少 anon key"。
根因：后台客户端校验逻辑写错——**服务端抓取只需要 service role key，浏览器专用的 anon key 不应进入工作流**。
修复：修正后台客户端的校验逻辑并推送（提交 `f52f8f2`）。

### 坑 3：Node 20 兼容性问题

症状：工作流报错，和 Supabase 凭据无关。
根因：Supabase 依赖在 **Node 22 才有原生 WebSocket 支持**，而工作流默认 Node 20。
修复：云端抓取运行时升级到 Node 22（提交 `69bfcfa`）。

### 坑 4：Supabase 域名 DNS 解析失败

症状：GitHub Actions 里域名无法通过 DNS 解析。
根因：**Project URL 里有一处字符复制错误**——URL 中字符顺序不同（如 `leuddu...` 与正确的顺序），导致域名不存在。
教训：核对项目控制台显示的实际 Project URL，逐字符比对，别信复制粘贴。

### 坑 5：service_role 没有显式表权限

症状：数据库连通了，但写入失败。
根因：创建表时关闭了默认暴露权限，导致 `service_role` 对知识库表**没有显式表权限**。
修复：增加一份只授予服务端角色权限的前向迁移（`0003_service_role_grants.sql`），在 SQL Editor 执行一次即可。**RLS 保持开启**，服务端权限与 RLS 不冲突。

### 坑 6：X/Twitter 的 RSS 源全灭

症状：首批 30 个候选中大量 X/Twitter 相关路由被上游以 **403/406 拒绝**。
根因：上游代理路由（`api.xgo.ing`）不稳定，且脚本把"部分源失败"错误地标记为**整个工作流失败**。
修复（两个）：
1. 筛出可靠的原生 RSS 源，替换不稳定来源
2. **个别 RSS 源失败只写健康状态和错误记录，不让整批定时任务失败**（提交 `00f9601`）

> 这条教训后来成了铁律：**单点失败必须局部化**，一个源的死亡不能拖垮整个管道。

---

## 85%：踩坑合集（下）——登录的至暗时刻

登录链路是全程最折磨人的部分，一串连环坑：

### 坑 7：NEXT_PUBLIC_* 变量"改了没用"

症状：线上登录页正常加载，但 `Failed to fetch` 发生在浏览器向 Supabase 发送登录请求之前。
根因：`NEXT_PUBLIC_*` 变量**在构建时写入 JS**，只改变量不触发新部署是无效的——必须核对打包产物并触发一次新的生产部署。

### 坑 8：Vercel Hobby 拒绝部署

症状：推送后 Vercel 不部署。
根因：**Vercel Hobby 计划对 Git 提交作者做权限校验**，此前使用的部署提交邮箱不属于 Vercel 项目成员。
修复：创建一个**不改代码的空提交**，使用已验证的账户邮箱署名并推送（避免改写 Git 历史）。

### 坑 9：登录邮件打开即 `otp_expired`

症状：新邮件首次打开仍提示验证码过期。
排查方向：Supabase 邮箱 OTP 配置、回调地址、域名通配（`https://rss-store-two.vercel.app/**`）。

### 坑 10：Supabase 邮件限流

症状：连续尝试后返回：

```json
{"code":"over_email_send_rate_limit","message":"email rate limit exceeded"}
```

**这是限流，不是代码错误。** 反复点击发送只会延长等待窗口。正确做法：等限流恢复后只发一封新链接。

### 坑 11：PKCE 回调缺失（登录失败真正根因）

症状：点击邮件里的链接直接回到首页，登录状态没有建立。
根因：原链接直接回首页，**PKCE 的 `code` 没有在服务端交换成会话 Cookie**。
修复（三处）：
1. 新增 `app/auth/callback/route.ts`：`exchangeCodeForSession(code)` 写入 Cookie
2. 登录页 `emailRedirectTo` 改为 `${window.location.origin}/auth/callback`
3. 中间件放行该回调路由

```typescript
// app/auth/callback/route.ts（核心逻辑）
const { code } = searchParams;
const supabase = createServerClient(url, anonKey, { cookies });
await supabase.auth.exchangeCodeForSession(code); // 交换会话，写入 Cookie
redirect('/');
```

### 坑 12：本机 next build 卡死

症状：`next build` 90 秒无任何产物更新，进程卡住。
判断：是环境卡顿而非编译错误——终止卡住的本地进程，**以类型检查 + Vercel 云端构建作为正式验证**，不把本地环境问题带进流程。

### 坑 13：演示数据伪装成知识库

症状：缺少 Supabase 配置时页面加载 `demo-data`，"资料库以外"的导航、笔记、订阅源操作没有真实路由。
修复：去掉生产环境的演示回退——**未连接云端时明确显示"尚未配置"**，而不是用假数据伪装成知识库。

---

## 90%：质量治理——信誉、预算、去重

部署稳定后，还有一层"自我治理"：

### 来源信誉评分

每个来源维护一个健康度分数，**只计算最近 30 天且最多 100 个观测**，防止远古数据污染评分。抓取失败会写入健康状态和错误记录，而不是静默消失。

### 容量熔断

数据库预算分级降速，防止失控：

| 使用率 | 动作 |
|:----:|:-----|
| 70% | 自动降速 |
| 80% | 仅保留审计候选 |
| 90% | 停止抓取与富化 |

默认预算 1.5 GB，可在 `atlas_runtime_settings` 调整。

### 历史质量复核

每天自动小批量复核历史质量记录，**不删除原始快照**。`purge-low-quality-articles.ts` 只处理"低质量且可重建"的派生数据。

### 安全底线

- 浏览器客户端**没有数据库表权限**，查询/笔记/收藏都在验证所有者邮箱后的服务端执行
- UI 仅允许 `APP_OWNER_EMAIL` 进入；智能体 API 用独立 token
- RLS 全程开启

---

## 100%：验收与运营

### 验收清单（10 个真实问题）

用 10 个实际问题验证系统：中英文检索、时间过滤、重复文章、来源引用、笔记写入…… 全部通过后系统才算"上线"。

### 运营节奏

- 配置每日失败告警、每周抓取质量报告
- 数据库备份与 token 轮换
- 两周试运行后，依据阅读和检索命中率扩充订阅源
- 源目录每天自动刷新，新源进候选池但**不自动订阅**——订阅永远是人决策的

### 最终状态

```
线上地址：https://rss-store-two.vercel.app（私有登录）
抓取：GitHub Actions 每小时小批量 + 每天目录刷新
富化：DeepSeek 中文清洗/摘要/分类（deepseek-v4-flash）
快照：R2 不可变快照（未配置时回退私有 Storage）
向量：Qdrant Cloud（未配置时回退 pgvector 兼容路径）
智能体：4 个 REST 操作，Bearer token 保护
```

---

## 总结

从 0 到 100，这个项目教会我的几件事：

1. **RSS 源库 ≠ 知识库**：源目录、原始快照、文章、知识（摘要/向量/笔记）必须分层，原始层永远保留
2. **云端托管不是炫技**：Supabase + Vercel + GitHub Actions 的组合，免费额度起步、零常驻服务、关机不断更
3. **渐进增强优于一步到位**：向量、R2、Qdrant 全部做成"可选 + 自动回退"，核心链路永远可跑
4. **单点失败必须局部化**：一个源 403 不能让整批定时任务失败，一个环境变量错误不能让部署静默卡住
5. **登录是最容易翻车的环节**：PKCE 回调、NEXT_PUBLIC 构建时注入、邮件限流、平台提交者校验，每一步都要验证
6. **密钥纪律是生命线**：service role key 只在服务端，浏览器和本地智能体各拿最小权限

一个能持续运行的知识库，不在于它接了多少源，而在于**分层是否清晰、失败是否可控、数据是否可追溯**。

---

**推荐资源：**
- [awesome-rss-feeds-list](https://github.com/xiangyugongzuoliu/awesome-rss-feeds-list) — 2000+ 精选 RSS 订阅源
- [Supabase](https://supabase.com/) — 托管 PostgreSQL + Auth + Storage
- [Vercel](https://vercel.com/) — Next.js 无服务器部署
- [RAGFlow](https://ragflow.io/) / [Qdrant](https://qdrant.tech/) — 向量检索方案
- [DeepSeek](https://www.deepseek.com/) — 中文富化与摘要
