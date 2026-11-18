---
title: "从 cc-switch 迁移到 magpie：把模型路由收进本地网关"
date: 2026-11-18
categories: "AI"
description: "对比 cc-switch 的配置改写方案与 magpie 的本地网关方案，记录一次 AI 编程工具模型管理方案的整体迁移，包含架构分析、迁移决策与完整配置流程"
tags: ["AI", "工程化"]
copyright: true
---

## 前言

AI 编程 agent 一多，配置文件就开始打架。

我手上同时开着 Claude Code、Codex、Gemini CLI、OpenCode、AtomCode，供应商也有官方订阅、中转站、自建服务几种。每个 agent 一套配置，每家供应商一套 key，两边一乘，环境变量和 baseURL 很快就互相覆盖。

中间用过两个工具来管这些：cc-switch 和 magpie。前面那个用了一阵，后来整体迁到了后面这个。这篇写清楚为什么换，以及 magpie 具体怎么配。

> 文中命令都是 magpie 的真实 CLI。供应商域名、密钥、余额这类信息做了泛化。

---

## 一、两个工具在做不同层次的事

cc-switch 和 magpie 都算「多供应商切换」，但下手的位置不一样。

### 1.1 要改的其实只有两样

一个 agent 想走某家供应商，本质上只需要动两处：请求发往哪个地址，以及带什么凭证。

剩下全是包装。这类工具干的活，就是在合适的时机把这两项换掉。区别只在于在哪儿换。

### 1.2 两条路线

| 路线 | 做法 | 代表 |
|---|---|---|
| 配置改写 | 切换时把选定供应商的配置写进 agent 自己的配置文件 | cc-switch 的主用法 |
| 本地网关 | agent 配置固定指向本地一个代理进程，由代理决定真实去向 | magpie 的唯一用法 |

两家的实现其实都覆盖了对方的能力，区别在**默认走哪条、是不是只有这一条**。后面会细说。

---

## 二、架构差在哪

### 2.1 cc-switch：把配置写进目标文件

cc-switch 的核心是一张 `providers` 表，每行的 `settings_config` 字段存着一整块 JSON，就是这个供应商对应的完整 agent 配置。

```
选中 provider → 把 settings_config 整块写入 agent 配置文件 → 标记 is_current
```

数据落在 SQLite 里，结构大致如此：

```sql
CREATE TABLE providers (
  id              TEXT,
  app_type        TEXT,      -- claude / codex / gemini …
  name            TEXT,
  settings_config TEXT,      -- 整块配置 JSON，切换时原样写入
  is_current      BOOLEAN,   -- 当前生效的那一条
  in_failover_queue BOOLEAN, -- 是否进故障转移队列
  provider_type   TEXT,      -- official / aggregator / direct…
  PRIMARY KEY (id, app_type)
);
```

切完之后，agent 配置文件里躺的是供应商的真地址：

```json
// ~/.claude/settings.json（cc-switch 模式下）
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://<供应商真实域名>",
    "ANTHROPIC_AUTH_TOKEN": "<该供应商的 key>"
  }
}
```

很直白：配置里写的是什么，请求就打到哪。

### 2.2 magpie：把流量收进本地

magpie 常驻一个本地网关，agent 配置里只有一个地址，就是本机端口：

```json
// ~/.claude/settings.json（magpie 模式下）
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3425"
  }
}
```

Codex 那边同理：

```toml
# ~/.codex/config.toml
model_provider = "magpie"

[model_providers.magpie]
base_url = "http://127.0.0.1:3425/v1"
wire_api = "responses"
```

真实供应商、密钥、路由策略、重试、计量，全在网关后面。换模型不用再碰配置文件。

### 2.3 差别落到实际使用上

| 行为 | 配置改写为主 | 网关为主 |
|---|---|---|
| 切换模型 | 改写配置文件 | 网关内部路由，配置文件不动 |
| 切换是否需重启 agent | 需要（配置在启动时读取） | 不需要 |
| 密钥存放位置 | agent 配置文件里，一处一份 | 只在网关配置里存一份 |
| 路由粒度 | 应用级（整个 agent 走某供应商） | 请求级（每次调用可路由到不同模型） |
| 多 agent 共用 | 各自配置各自的 | 全部指向同一个网关 |

cc-switch 默认管的是「这个 agent 用谁」，magpie 默认管的是「这次请求用谁」。

### 2.4 补充一句：cc-switch 其实也有本地代理

这里得说句公道话，免得把对比写歪。

cc-switch 并不是只能改写配置。它的库里有一张 `proxy_config` 表，字段包括 `listen_port`（默认 15721）、`max_retries`、`auto_failover_enabled`、熔断阈值、成本倍数、定价来源这些，能力上也是一个完整的代理。

我本地记录里，这个代理前后跑过 26385 次请求（claude 23937 次、codex 2448 次），时间从 10-08 到 11-05。不是摆设，是真干过活的。

真正的差别不在「有没有网关」，而在于：

- 在 cc-switch 里，代理是个可选功能，得手动开（`proxy_enabled`），默认走配置改写；两套机制并存，配置来源容易混。
- 在 magpie 里，网关是唯一的路，所有 agent 都走它，没有第二套机制可选。

对我来说，后者更省心：不用记「这次切换走的是哪条路」。前者更像「配置改写 + 一个可以打开的代理开关」，功能不缺，但心智负担在。

---

## 三、为什么换

不是因为 magpie 更新。是几件具体的事，在「网关是唯一的路」这个前提下更顺。

### 3.1 切换粒度

配置改写的思路里，切换的最小单位是整个 agent。Claude Code 一旦指向某家，它发的每次请求都走那里。

但实际干活时，不同任务的模型需求差很多。日常改代码用便宜快的，做架构设计才值得切到贵的。网关方案下，这件事变成路由组：

```
group/xxx  →  由网关决定这次请求落到组里哪个成员
```

agent 侧只填一个组名，组里换成什么跟它无关。

### 3.2 密钥不再散落

cc-switch 走配置改写时，每家的 key 会被写进对应 agent 的配置文件。用几家就有几份明文 key 躺在不同文件里。它开代理时能规避这点，但开关是手动开的，忘了开就还是散着。

magpie 默认就只有网关这一条路，agent 配置里只有 `127.0.0.1:3425` 一个地址，凭证全在网关一处。轮换 key 改一个地方，也不用担心某个 agent 的配置被顺手提交进仓库。

### 3.3 用量和配额

配置散着放，带来的直接后果是查账麻烦。花了多少、各家还剩多少额度，得挨个后台看。

流量收口之后两条命令的事：

```bash
magpie usage 30d              # 30 天内各 agent、各模型、各账号的 token 与花费
magpie quota                  # 每个订阅、套餐、余额还剩多少
magpie quota history --days 7 # 过去 7 天各窗口的额度变化
```

注意 `quota history` 用的是 `--days 7`，不是 `7d`，写成 `7d` 会报「no readings kept of 7d」。`usage` 倒是接受 `30d` 这种写法。

同一个中转站的多个 key、不同订阅的余额，一条命令看完，不用开几个浏览器标签页。

### 3.4 命令行能覆盖大部分操作

cc-switch 是纯 GUI，切换靠点。轻量用法没问题，但想脚本化就卡住了。

magpie 的 CLI 覆盖得比较全，日常操作基本都能落成命令：

```bash
magpie ls                                  # 所有 agent 当前状态一览
magpie claude <provider>/<model>           # 给 agent 指定模型
magpie claude effort high                  # 改单个字段
magpie claude default                      # 把 magpie 摘出去，恢复原状
```

最后那个 `default` 值得单独说。它能把你从工具里干净地摘出来，而不是留一堆被改过的配置文件在磁盘上。出了问题有退路。

### 3.5 cc-switch 也有它的好处

迁移之后 cc-switch 的数据我还留着，它有几处确实做得不错：

- GUI 更成熟，切换供应商直观，不用记命令。
- MCP、Skills、Prompts 三类资源在同一个界面里管，我那边躺着 6 个 MCP、67 个 Skills。magpie 的 library 也能管这些，但界面组织方式不一样，得重新适应。
- 常见国内外供应商有现成模板，填 key 就能用。
- 数据是 SQLite，备份、迁移、diff 都方便。
- 内置 `in_failover_queue` 标记，可以在应用层做降级。

要是手上只有两三家供应商、一两个 agent，也很少切模型，cc-switch 的 GUI 其实更省事。收益是随规模涨上来的。

---

## 四、能力盘点对照

迁移前实际盘了一遍两边的覆盖面，这张表是当时的决策依据：

| 维度 | cc-switch | magpie |
|---|---|---|
| 管理形态 | 桌面 GUI | 桌面 GUI + 菜单栏 + TUI + Web |
| 配置存储 | SQLite（`~/.cc-switch/cc-switch.db`） | JSON 明文（`~/.config/magpie/`） |
| 本地代理 | 有（默认关，需手动开） | 是唯一路径 |
| agent 覆盖 | claude、codex、gemini、claude-desktop、hermes、openclaw | 十余个，含 Claude Code / Codex / Gemini CLI / OpenCode / AtomCode / VS Code 等 |
| 路由粒度 | 代理开启时支持请求级 | 原生请求级（路由组） |
| 切换是否重载 | 配置改写需重载 | 不需要 |
| 用量统计 | 有（本地汇总 + 代理日志） | `usage` / `sessions` / `quota` 三套维度 |
| 可脚本化 | 弱 | 强（完整 CLI） |
| 远程 / 多机 | 无 | `magpie web` / `magpie serve` / LAN |
| 可逆回退 | 覆盖写回 | `magpie <agent> default` |
| MCP / Skills 管理 | 有（本地 6 个 MCP、67 个 Skills） | 也有（library 里管 MCP、Skills、提示词） |

---

## 五、magpie 怎么配

### 5.1 先决定怎么跑

```bash
magpie              # 桌面窗口 + 菜单栏图标
magpie tray         # 只留菜单栏
magpie tui          # 终端界面
magpie web          # 浏览器访问（WSL、远程服务器可用）
magpie serve        # 作为系统服务常驻（launchd / systemd）
```

前面说的本地网关（默认 `127.0.0.1:3425`），应用起来就自带了，不用单独启动。

### 5.2 四层结构

magpie 的配置分四层，理清楚之后剩下的都是填参数：

```
provider（供应商/账号）
   └── 提供 models
group（路由组）
   └── 把多个模型聚合成一个可选项
agent（被管理的工具）
   └── 指定用哪个 model 或哪个 group
profile（快照）
   └── 把当前所有 agent 的设置打包存档
```

### 5.3 接入 provider

一条 provider 记录里不只有地址和 key。同一个供应商的三种协议端点可以一次配好，让不同 agent 各取所需：

```jsonc
{
  "id": "my-relay",
  "name": "我的中转站",
  "key": "sk-****",
  "chat":      "https://api.example.com/v1",       // OpenAI Chat 协议
  "anthropic": "https://api.example.com",          // Anthropic 协议
  "responses": "https://api.example.com/v1",       // Responses 协议
  "baseAPI": "anthropic",                          // 默认走哪个
  "models": ["claude-sonnet-5", "gpt-6.1-sol"]
}
```

GUI 里填表最快，也支持导入链接：

```bash
magpie import "magpie://import?..."    # 从分享链接导入
```

### 5.4 用 group 做路由

group 是 magpie 相对 cc-switch 最有价值的一块。

```bash
magpie group add <name> models=<m1>,<m2> [routing=...] [stays=...]
```

成员写成 `provider/model`，routing 决定组内怎么选：

| routing | 语义 |
|---|---|
| `smart` | 默认。有余额的订阅里，最快到期的先用 |
| `order` | 按顺序，第一个不能用了才换下一个 |
| `rotate` | 每条消息换下一个成员的账号/key，工具调用跟着它走 |
| `usage` | 剩余额度最多的先用 |
| `pace` | 按「本周还剩多少 / 到重置还有几小时」排序，少浪费 |
| `weight` | 按 `weight=` 的分摊比例下发 |
| `drain` | 一个账号用到干，再换下一个，且不回头 |
| `fast` | 近期响应最快的供应商优先 |
| `cheap` | 当前成本最低的优先 |
| `expiring` | 先免费额度、最快过期的先，没有了才用付费 |
| `manual` | 只用 `pick=` 指定的那个，不故障转移 |

`free` 不在 routing 里，它是 models 的前缀写法（`free:workbuddy/*`），作用是只保留供应商标记为免费的模型，别混用。

几个实际会用到的：

```bash
# 同一模型的多个来源兜底：一个挂了自动换下一个
magpie group add claude-5-fallback \
  models=relay-a/claude-sonnet-5,relay-b/claude-sonnet-5 \
  routing=order

# 免费额度优先，快过期的先用，没有了才动付费的
magpie group add expiring-first \
  models=relay-a/claude-sonnet-5,relay-b/claude-sonnet-5 \
  routing=expiring

# 一个账号用到干再换下一个，不来回切
magpie group add drain-one-by-one \
  models=relay-a/claude-sonnet-5,relay-b/claude-sonnet-5 \
  routing=drain
```

agent 侧引用时写 `group/<id>`：

```bash
magpie claude group/claude-5-fallback
```

「不用重启就能换模型」就是这么来的。agent 只认组名，组里换谁它不知道也不关心。

### 5.5 给 agent 指定模型

单模型直接写，`provider/model` 或 `group/<id>` 都行：

```bash
magpie claude relay-a/claude-sonnet-5
magpie codex  relay-a/gpt-6.1-sol
```

Claude Code 有几个特殊槽位，可以让主模型和子代理各用各的：

```bash
magpie claude opus   <model>    # opus 槽位单独指定
magpie claude sonnet <model>    # sonnet 槽位单独指定
magpie claude subagent <model>  # 子代理单独指定
magpie claude <slot> default    # 单槽位恢复默认
```

其余常用字段（以 Claude Code 为例）有 `effort`、`auto_mode`、`permission_mode`、`statusline`、`login`：

```bash
magpie claude effort high       # 推理强度
magpie claude effort default    # 恢复
```

### 5.6 profile 存档

调顺手之后存一份，换机器或换场景时直接还原：

```bash
magpie save 工作模式      # 当前所有 agent 的设置存为快照
magpie use  工作模式      # 应用
magpie profiles          # 列出所有快照
magpie rename 旧名 新名
magpie rm 名字
```

配置本身就是个键值结构：

```jsonc
{
  "setup": {
    "claude.model":  "group/claude-5-fallback",
    "claude.effort": "max",
    "codex.effort":  "high"
  }
}
```

### 5.7 确认配置生效

配完先查一遍再干活：

```bash
magpie ls            # 所有 agent 状态：当前模型、effort、配置文件路径
magpie claude        # 单个 agent 的详情
magpie groups        # 所有路由组及其成员
magpie quota         # 各供应商额度
```

`magpie ls` 的输出大概这样，一眼能看出每个 agent 现在指向哪：

```
Claude Code       relay-a/gpt-6.1-sol  ·  effort high   ~/.claude/settings.json
Codex             relay-a/gpt-6.1-sol  ·  effort high   ~/.codex/config.toml
Gemini CLI        auth api-key                          ~/.gemini/settings.json
```

### 5.8 备份

```bash
magpie backup --no-keys backup.enc          # 导出（不带密钥）
magpie backup backup.enc                    # 带密钥，需口令
magpie restore backup.enc                   # 导入
```

`--no-library` 跳过模型库，`restore --no-agents` 只导供应商和设置、不动 agent 配置。`--no-keys` 导出来的版本可以直接分发。

---

## 六、日常命令速查

| 目的 | 命令 |
|---|---|
| 总览 | `magpie ls` |
| 看单个 agent | `magpie claude` |
| 设模型 | `magpie claude group/xxx` |
| 设单个字段 | `magpie claude effort high` |
| 摘除 magpie | `magpie claude default` |
| 看可用模型 | `magpie models [agent]` |
| 看路由组 | `magpie groups` |
| 用量 | `magpie usage 7d` |
| 配额 | `magpie quota` |
| 会话花费 | `magpie sessions --days 7` |
| 会话检索 | `magpie sessions search <关键词>` |
| 快照 | `magpie save <名>` / `magpie use <名>` |
| 备份 | `magpie backup [--no-keys] <file>` |
| 更新 | `magpie update` |
| 设置项 | `magpie settings list` |

---

## 七、踩过的坑

**1. 网关没起来，agent 全体失联**

网关架构的代价：所有 agent 都指向 `127.0.0.1:3425`，magpie 一没运行，全部 agent 连不上。配置改写方案没这个问题，它不依赖常驻进程。

解决办法是 `magpie autostart on` 设成登录自启，或者用 `magpie serve` 注册成系统服务。不想常驻也行，那就接受「用之前先启动」这个前提。

**2. 组名不等于引用名**

`magpie group add` 的 name 会推导出一个 id，agent 引用的其实是这个 id：

```bash
magpie group add "Claude 5.5 系列" models=...   # 建出来
magpie claude group/claude-5-5                  # 引用的是推导出的 id
```

名字里带空格、中文、点号时推导结果不好猜。用 `magpie groups` 看实际 id 最稳。

**3. 改完 id 要重新设 agent**

组可以改 id，但指向旧 id 的 agent 不会跟着改，会静默失效。改完 `magpie ls` 复查一遍。

**4. `default` 是「摘出去」，不是「设为默认值」**

```bash
magpie claude default        # 把 magpie 从 Claude Code 里摘除，恢复原始配置
magpie claude effort default # 单字段恢复 agent 自己的默认
magpie claude opus default   # opus 槽位回到跟随主模型
```

容易读错，但语义其实合理，就是前面说的那个退路。

**5. 模型名后缀别想当然**

模型引用后面可以带修饰，比如 `group/xxx[1m]`、`provider/model:high`、`:fast`、`#account`。这些后缀在实际配置里确实出现，但含义不要靠猜，写错了不会报错，只是行为跟你想的不一样。

用之前查一遍：

```bash
magpie group help      # 后缀的完整说明
magpie models <agent>  # 该 agent 能用的模型原样列表
```

---

## 八、实战：白嫖 workbuddy 和 qoder，然后被封

前面讲配置，这一节讲点更实际的：怎么拿 magpie 来薅羊毛。

### 8.1 白嫖思路

workbuddy 和 qoder 都送免费额度，注册即到账，每月刷新。既然有人送，那就收着。把额度用满本来就是这类免费入口的用法。

一个账号的额度有限，那就多开几个。算术题。

### 8.2 用 magpie 把羊毛织成网

magpie 很适合干这个。每个账号是独立 provider，还能把多个账号串成一个组轮询。

```bash
# 把多个免费账号当成一个池子用
magpie group add free-pool \
  models=workbuddy-ai/gpt-6-sol,workbuddy-ai/gpt-5.6-sol \
  routing=rotate
```

`routing=rotate` 是关键。它在多个账号之间轮流，把「多账号」这件事全自动化了，账号切换、额度探测、余额刷新都不用管，用起来跟单个账号没区别。

功能好用得有点危险。账号一多，一台机器就能同时跑起来好几个免费的。本地记录能看到当时的规模：workbuddy 开了 2 个独立账号，qoder 也有多个来源，额度历史每天往下走。

### 8.3 结果：被封了

直说，号被封了。

不是立刻 403，是更阴险的那种：额度异常快地归零，然后停在那里，既不恢复也不报错。你很难第一时间分辨是自己用完了还是被处理了。

magpie 把每次额度探测都记了下来，事后翻，消耗轨迹很清楚。

主力那个 workbuddy 账号，前后留下 239 条读数，跨 10-20 到 11-12。前段正常消耗，最后一段一路砸到 0：

```
2026-11-04  11.71  ← 还在正常下降
2026-11-04   0     ← 归零
2026-11-10   0
2026-11-10   0
2026-11-12   0     ← 再没变过
```

还有个横向对比。workbuddy 两个账号恰好在同一个计费周期里（`2026-10-31` → `2026-11-30` 重置）：

| 账号 | 窗口 | 最终读数 |
|---|---|---|
| 账号 A（主力） | 10-31 ~ 11-30 | 0 |
| 账号 B（另一个） | 10-31 ~ 11-30 | 100 |

A 从 100 一路干到 0，B 基本没动过。一个负责干活，一个负责备着。

qoder 那边更惨，总共只留下 2 条读数，首次探测就是 `left: 0`，之后再没变过。还没跑起来就已经没了。

事后我把这几个 provider 在 magpie 里逐个关了（配置里 `off: true`），现在 `magpie quota` 已经不列它们。

### 8.4 风控是怎么揪出来的

这部分是推断，不是服务方的官方说法。拿不到风控规则，只能按行业通例倒推：

- 设备指纹。同一台机器、同一个浏览器环境注册多个账号，这是最容易被识别的模式，嫌疑最大。
- IP 聚集。几个账号的请求都从同一个出口 IP 出去，一眼就串起来了。
- 行为同质。多个账号在同一时段、用同样的模型、跑同样的任务，调用曲线高度重合，像同一个人。
- 消耗速度。免费额度是让人体验的，不是让人跑满的。短时间榨干本身就是异常信号。
- 信息交叉。手机号、邮箱域名、绑卡信息，免费额度也躲不过这些。

有个细节值得注意：风控不一定是立刻封，更常见的是先掐额度。直接封号会引发申诉，把免费额度清零又安静又省事。你甚至不会第一时间意识到自己被处理了，只会纳闷怎么一直没额度。

等到反应过来，通常已经过了好几天。

### 8.5 后续打法

被封归被封，该薅还得薅。这次算是摸清了边界：

- 免费额度当体验用，不当产能。用完换下一个，不规划、不依赖。
- 付费和自建得有托底。不是为了体面，是关键时刻不能掉链子。免费的随时会被收走，这是它的性质，不是意外。
- **路由策略挑对**。几个免费账号轮换用 `rotate`；想先用快过期的用 `expiring`；一个账号用到干再换下一个用 `drain`。这三个语义不一样，别写混。
- 该睡就睡。主力账号别往死里跑，留点余量的账号寿命长得多。

顺带说个这次才注意到的点：`rotate` 是「每条消息换一个账号/key」，工具调用跟着同一条走。如果想让整个会话黏在一个账号上（缓存命中更高），加 `stays=session`。

说到底，薅免费额度就是个成本控制手段。工具给你免费入口，你把额度用满。只要账号还能注册、服务还没改规则，这场游戏就还没结束。

---

## 九、总结

这次迁移真正变化的，是把「切换模型」从配置文件层面下移到了请求层面。

选哪条路看处境：

- 供应商少、agent 少、很少切模型，cc-switch 更省事，GUI 点一下就好，也不用管常驻进程。
- 供应商多、agent 多、要按任务切模型、要统一看用量，magpie 的网关架构优势明显，配置改动量基本不随规模增长。
- 需要给多台机器或团队共享模型入口，只有网关方案能做到。

代价也挺明确：多了一个必须活着的进程。能接受这个前提，剩下的都是收益。

---

## 参考资料

- [magpie 官方文档](https://usemagpie.ai)
- [Hexo 官方文档](https://hexo.io/docs/)
