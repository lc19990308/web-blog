---
title: "Jev 决策模型实战（二）：数据与训练"
date: 2026-09-30
categories: "AI"
description: "从 600 条翻车数据到 1082 条干净样本，LoRA 训练从 63% 到 78% 的全过程。数据重复率 68%、跨集泄漏 66 组、训练慢 180 倍的性能坑，都是真实踩过的。"
tags: ["AI", "Jev", "LoRA", "训练", "数据质量", "温度校准"]
copyright: true
---

整个项目 80% 的时间花在数据上，20% 花在训练。这不是夸张。第一版数据翻车翻得彻底，第二版修复后效果翻倍。数据质量决定模型上限，训练只是逼近它。

## 第一版数据：三个致命问题

用模板生成了 600 条客服对话，8 个意图各 75 条。跑了个质检脚本，结果很难看。

**重复率 68%。** 每个意图只写了 5 个对话模板，要生成 75 条，大部分是复制粘贴加微小扰动。600 条里只有 189 条唯一。质检脚本用 MD5 哈希对话内容做去重，一看重复率就懵了。

**跨集泄漏 66 组。** 同一对话同时出现在 train 和 test 集。原因是先生成 600 条再随机划分，重复的样本被分到不同集合。测试集混进了训练数据，分数是虚高的。

**有效训练样本仅 154 条。** 去重后 train 集只剩 154 条唯一数据。模型看到的其实是 154 条翻来覆去地看，不是 420 条。

用这份数据训练出来的模型，准确率 63.3%。但这是在污染的测试集上测的，真实表现更差。`other` 类 F1 直接是 0，模型从不预测它。

质检脚本长这样，几行代码就能暴露问题：

```python
from collections import Counter, defaultdict

def dialog_key(row):
    return "|".join(d["content"] for d in row["state"]["dialog"])

# 唯一性
keys = [dialog_key(r) for r in all_rows]
dup_rate = 1 - len(set(keys)) / len(keys)
print(f"重复率: {dup_rate:.0%}")  # 68%

# 跨集泄漏
split_map = defaultdict(set)
for r in all_rows:
    split_map[dialog_key(r)].add(r["split"])
leak = sum(1 for k, v in split_map.items() if len(v) > 1)
print(f"跨集泄漏: {leak}")  # 66
```

## 数据修复：模板扩充 + 槽位扰动

根因是模板太少。修复方案分三步。

**第一步：扩模板。** 每意图从 5 个扩到 12 个以上。真实客服场景的对话有各种变体：直接说「我要退款」、拐弯说「买回来不太合适」、带情绪说「这什么破玩意不要了」。

**第二步：槽位填充。** 订单号、商品名、金额用占位符，生成时随机替换：

```python
ORDERS = ["20260920-881", "20260928-123", "20260915-456", ...]
PRODUCTS = ["红色外套", "蓝牙耳机", "保温杯", "机械键盘", ...]
AMOUNTS = ["99", "199", "200", "350", "58", "1280", ...]

def fill_slots(text):
    return (text.replace("{ORDER}", random.choice(ORDERS))
                .replace("{PRODUCT}", random.choice(PRODUCTS))
                .replace("{AMOUNT}", random.choice(AMOUNTS)))
```

这样同一模板能生成几十条不同的样本。

**第三步：同义词扰动。** 随机替换成近义词，增加文本多样性：

```python
SYNONYMS = {
    "谢谢": ["谢谢", "感谢", "多谢", "谢了"],
    "订单": ["订单", "单子", "单", "这单"],
    "抱歉": ["抱歉", "对不起", "不好意思"],
}

def vary(text):
    for k, opts in SYNONYMS.items():
        if k in text and random.random() < 0.3:
            text = text.replace(k, random.choice(opts), 1)
    return text
```

**去重和划分的顺序很关键。** 必须先去重，再划分三集。反过来划分，重复样本会被分到不同集合造成泄漏。划分还要分层，保证每个意图在三个集合里都有足够样本。

## 多轮对话构造

意图识别不能只用单句。真实对话是多轮的，意图在对话中逐步显露。

我们的多轮样本长这样：

```
user: 在吗？想问个事儿
agent: 您好请讲
user: 我上周在你们这买了个东西
agent: 订单号方便说下吗
user: 是 蓝牙耳机，唉，买回来觉得不太合适
agent: 请问是质量问题还是不喜欢呢
user: 就是不喜欢，能退吗
```

前几轮不说意图，中间确认，最后一句才点明。这比直接说「我要退款」难得多，但也真实得多。

还加了三类陷阱样本：

- **指代**：「就是上次那个」「就那个单」，要结合上下文理解
- **意图切换**：先问订单，突然转投诉
- **脏文本**：错别字、语气词（「谢谢！！」「退欵」）

最终数据对比：

| | v1 翻车版 | **v5 修复版** |
|--|-----------|---------------|
| 总量 | 600 | **1082** |
| 唯一样本 | 189 | **1082** |
| 重复率 | 68% | **0%** |
| 跨集泄漏 | 66 组 | **0** |
| 平均轮数 | 3.2 | **8.3** |
| 每意图唯一 | 22-26 | **72** |
| test 最小类 | 5 条 | **12 条** |

对比样本（「找不同」）：同一段对话改一个关键事实，答案就翻转。比如「这个能退吗」→ 退款，「你们必须给个说法」→ 投诉。这让模型学边界，不是背关键词。

## 训练：LoRA 微调

训练配置：

```python
from peft import LoraConfig, get_peft_model
from transformers import TrainingArguments, Trainer, BitsAndBytesConfig

# 4bit 量化加载基座
bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4"
)
base_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3-0.6B", quantization_config=bnb, device_map="auto"
)

# LoRA 配置
lora = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM"
)
model = get_peft_model(base_model, lora)

# 训练参数
args = TrainingArguments(
    num_train_epochs=4,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,   # 等效 batch=16
    learning_rate=3e-5,
    bf16=True,
    warmup_ratio=0.05,
)
```

训练文本用自然语言问答格式，不是 JSON：

```
你是意图识别与决策模型。根据对话状态回答类型化问题，只输出选项 key。

【对话状态】
user: 我要退款
agent: 请问是哪一单？
user: 就是上周买的那个，不想要了

【问题】
综合对话，用户当前意图是什么？

【选项】
- refund_request: 退货退款
- billing_dispute: 账单争议
- order_query: 订单物流
...

【答案】
refund_request
```

三个训练细节：

**选项顺序 shuffle。** 不 shuffle 模型会记住「第一个选项更可能是答案」。每条样本训练前随机打乱选项顺序：

```python
def shuffle_choices(choices):
    keys = list(choices.keys())
    random.shuffle(keys)
    return {k: choices[k] for k in keys}
```

**温度设 0。** 决策任务要确定性。`temperature=0, top_k=1`。

**输出越短越好。** 只要选项 key，不要解释。省 token、推理快、不容易格式错。

## 性能坑：padding 策略

第一版训练跑了 41 分钟，第二版只跑了 73 秒。差了 180 倍，原因是 padding 策略。

`padding="max_length"` 到 768，但样本平均只有 21 字（约 30 token）。96% 的算力花在算 padding 上。改成 `padding="longest"` 后，每个 batch 只 pad 到最长样本的长度，快了 180 倍。

```python
# 慢
tok(batch["text"], truncation=True, max_length=768, padding="max_length")

# 快
tok(batch["text"], truncation=True, max_length=768, padding="longest")
```

这个坑在长序列任务上不明显，但在短序列任务上是致命的。

## 基线对比：值不值得训

训练前必须跑基线。不跑基线，你不知道训练是有效还是白费。

| 基线 | 准确率 | 说明 |
|------|--------|------|
| 规则关键词 | 57.3% | 简单 if-else 正则匹配 |
| Qwen3-0.6B 零样本 | 44.4% | 不训练直接问 |
| **LoRA 训练后** | **78.2%** | **比规则高 21 点** |

零样本只有 44%，说明小模型不训练做不了意图识别。训练后 78%，比规则高 21 点，说明「值得训」。

训练后各类 F1：

| 类别 | F1 | | 类别 | F1 |
|------|-----|---|------|-----|
| tech_support | **1.00** | | order_query | 0.92 |
| praise | **0.97** | | complaint | 0.88 |
| billing_dispute | 0.81 | | refund_request | 0.77 |

`tech_support` 和 `praise` 几乎完美，`refund_request` 和 `billing_dispute` 边界有混淆。

## 温度校准：让概率可信

神经网络天然过度自信。模型说 85% 确定，实际可能只有 66% 对。这对置信度路由是致命的——你不知道 0.85 意味着什么。

温度校准的做法：用 calib 集（数据的 15%，独立于 train 和 test）拟合一个温度参数 T：

```python
def fit_temperature(logits, labels):
    # 优化 softmax(logits/T) 的 NLL
    log_T = torch.zeros(1, requires_grad=True)
    opt = torch.optim.Adam([log_T], lr=0.01)
    for _ in range(200):
        T = torch.exp(log_T)
        nll = F.cross_entropy(logits / T, labels)
        nll.backward()
        opt.step()
    return float(torch.exp(log_T))
# 结果 T = 2.86
```

校准效果：

| | 校准前 | 校准后 |
|--|--------|--------|
| 平均 confidence | 0.944 | 0.816 |
| 实际正确率 | 0.759 | 0.759 |
| ECE（校准误差） | 0.223 | **0.068** |

校准前 confidence 比正确率虚高 18 个点。校准后基本对齐。ECE 从 0.223 降到 0.068，降了 70%。现在「confidence ≥ 0.85 自动处理」这个阈值才有实际意义。

## 弱项补强

`out_of_scope` 类最初 F1=0，模型从不预测它。试了三招。

**补样本。** 补了 150 条带槽位的 out_of_scope 样本，每条都是明显的非业务场景，像查天气、写诗、推荐电影这些。

**改名。** 把 `other` 改成 `out_of_scope`。`other` 是一个非常通用的词，在训练数据中出现频率太高（各种上下文里都有），模型学不到它的独特语义。`out_of_scope` 更具体，token 更容易和特定场景关联。效果立竿见影，F1 从 0 提到 0.18。

**置信度兜底。** 低置信时归为 out_of_scope。用 calib 集搜索最佳阈值（0.20），配合改名策略，最终 F1 到 0.43。

`refund vs complaint` 边界也补了 75 组对比样本。同样的场景改一个词，答案就变。边界测试 10/10 全对。

## 训练心得

数据决定上限。600 条翻车数据训出 63%，1082 条干净数据训出 78%。数据质量的差距比算法调参大得多。

LoRA 很省。只训 0.38% 参数，9MB adapter，基座不动。换任务换 adapter，不重新下载基座。我们用同一个基座还训了一个斗地主 AI，数据换掉就行。

选项 shuffle 不能省。不 shuffle 的话模型会学到「第一个选项最可能对」，上线后选项顺序一变就崩。

温度校准不能省。没校准的 confidence 是「感觉」，校准后才是「可依赖的决策依据」。

下一篇讲怎么用：多维标签设计、和 LLM 协同、三档路由策略。
