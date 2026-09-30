---
title: "Jev 决策模型实战（一）：部署篇"
date: 2026-09-30
categories: "AI"
description: "从环境搭建到 Ollama 部署的完整过程。VC++ DLL 缺失、torch 装成 CPU 版、GGUF 转换崩溃、官方 converter 的正确用法，每个坑都有排查过程和解决方案。"
tags: ["AI", "Jev", "Ollama", "部署", "GGUF", "RTX 5060"]
copyright: true
---

TypeSafe 在 2026 年 9 月发布的 Jev 模型在开发者圈子里引起了不小的讨论。它跟 ChatGPT 那类模型不一样，不写文章、不聊天、不生成代码，只做一件事：根据输入状态输出一个带概率的判断。

这个东西的定位是「System One 模型」，名字来自卡尼曼的系统一思维。官方的说法是把它叫做「嵌进软件里的有限决策组件」。用更直白的话讲，它是一个更聪明的 if 语句。传统代码写条件判断需要精确表达，但用户说「这个东西买回来不太合适，能退吗」的时候，关键词匹配就抓瞎了。Jev 处理的就是这种模糊语义判断。

跟 LLM 的核心区别在输出形式。LLM 返回自由文本，你不知道它有多确定。Jev 直接告诉你 `refund: 0.85, complaint: 0.10`，概率是核心输出。延迟 70-500ms，比调大模型快得多。

GitHub 上的开源生态分三层。专门训练的有 NanoJev（Qwen3-0.6B，有训练代码）、Tev1（Qwen3.5-4B，Together 出品）、Open-Jev（2B/9B/27B，最完整的复现）、Bespoke Nimble（9B，LoRA 加对比数据法）。不训练直接包装的有 AnyJev（Nokia 出品，读 logits 零训练，在 BANKING77 上准确率从 74.7% 提到 80.7%）、Simple Jev、LLM2Jev。部署服务有 local-jev、vllm-jev、Ollaya。

我们决定自己训一个。数据敏感不能送出去，官方不可微调加不了业务分类，0.6B 小模型在消费级显卡上就能跑。从 AnyJev 零训练验证可行性开始，走完整条路。

## 硬件摸底

配置不算豪华但够用：RTX 5060 8GB、Ryzen 5 5600X、16GB 内存。0.6B 到 2B 做 LoRA 微调没问题，全参微调就别想了。

RTX 5060 是 Blackwell 架构，compute capability 是 sm_120。这个数字后面很重要。4bit 量化训练需要 CUDA 12.8+ 和对应的 PyTorch，旧 toolkit 不认这块卡。bitsandbytes 的 kernel 也是按 compute capability 编译的，版本不对直接报错。

## 坑一：VC++ 运行库

装好 PyTorch 后 `import torch` 直接崩：

```
OSError: [WinError 126] 找不到指定的模块。
Error loading "...torch/lib/c10.dll" or one of its dependencies.
```

弹窗说 Visual C++ Redistributable 没装。但查注册表 HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64 显示 `Installed=1, Major=14, Minor=51`，已经装了。

进一步查 System32 目录，`msvcp140.dll` 和 `vcruntime140.dll` 不在。`msvcp140_1.dll` 和 `vcruntime140_1.dll` 倒是在。缺了两个最基础的。

静默安装 `vc_redist.x64.exe /install /quiet /norestart` 没写入 DLL。提权 `-Verb RunAs` 也不行。可能是安装器判断已装而跳过了。

最后的办法：从 `C:\Windows\System32\Microsoft-Edge-WebView\` 目录找到这两个 DLL，复制到 torch 的 `lib\` 目录。DLL 就放在模块旁边，Windows 会优先从模块目录搜索依赖。这个坑在 Windows 上不新鲜，DLL 装了但不在标准搜索路径。

## 坑二：torch 装成 CPU 版

`pip install torch` 默认装 CPU 版本。`torch.cuda.is_available()` 返回 False，`torch.cuda.get_device_name()` 直接报错。

CUDA 版要指定源：

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu128
```

但这个命令会拉 nvidia-cublas、nvidia-cudnn 等一堆 CUDA 库，每个几百 MB，总下载量 2GB+，经常超时。我们试了 3 次都失败在下载环节。

解决方案：用浏览器下载 wheel 文件到本地。从 `https://download.pytorch.org/whl/cu128/` 找到对应 Python 版本的 wheel（约 800MB），下到 `C:\Users\lc199\Downloads\`，然后本地安装：

```powershell
pip install C:\Users\lc199\Downloads\torch-2.11.0+cu128-cp312-cp312-win_amd64.whl
```

安装后验证：

```python
import torch
print(torch.__version__)                    # 2.11.0+cu128
print(torch.cuda.is_available())            # True
print(torch.cuda.get_device_name(0))        # NVIDIA GeForce RTX 5060
print(torch.cuda.get_device_capability(0))  # (12, 0)  sm_120
print(torch.cuda.get_device_properties(0).total_memory / 1e9)  # 8.52 GB
```

## 冒烟测试

环境好了不能直接开训。先花 5 分钟确认整条链路，省得训到一半才发现问题。

冒烟测试要验四件事：GPU 有没有认到、4bit 能否加载、LoRA 挂不挂得上、反向传播跑不跑得通。

```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model

# 4bit NF4 量化加载
bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4"
)
model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3-0.6B",
    quantization_config=bnb,
    device_map="auto",
    trust_remote_code=True
)

# 挂 LoRA
lora = LoraConfig(
    r=8, lora_alpha=16, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora)
model.print_trainable_parameters()
# trainable params: 2,293,760 || all params: 598,343,680 || trainable%: 0.3834

# 关键：前向 + 反向
x = torch.randint(0, 1000, (1, 32), device="cuda")
out = model(input_ids=x, labels=x)
out.loss.backward()  # ← 这行过了才算能训练
print("SMOKE_OK:", float(out.loss))  # loss=8.93
```

`out.loss.backward()` 是关键。模型能加载不代表能训练，必须确认梯度能回传。我们的一次通过，loss 8.93，LoRA 只占 0.38% 参数。

## 基座选型：Qwen3-0.6B

三个理由：

**小。** 0.6B 参数，4bit 量化后显存约 2-3GB，8G 卡跑得动还有余量。训练一轮 5 分钟，迭代快。

**中文好。** 意图识别是中文任务。Qwen 系列在中文上的 tokenizer 和语义理解比 Llama 系列强。我们测试过 zero-shot 中文意图识别，Qwen3-0.6B 能到 44%，同级 Llama 只有 30% 出头。

**生态成熟。** LoRA、量化、GGUF 转换工具链完善。社区踩坑资料多，出问题好搜。

后续准确率不够可以升 Qwen3.5-2B。LoRA 是挂在基座外面的补丁，基座随时换，adapter 重新训就行。

模型下载走 hf-mirror.com。HuggingFace 官方在国内经常超时，hf-mirror 是国内镜像。把 `model.safetensors`（1.42GB）和 config/tokenizer 文件下到本地目录，用 `local_files_only=True` 加载，完全不走网络。

```python
model = AutoModelForCausalLM.from_pretrained(
    r"C:\Users\lc199\Downloads\Qwen3-0.6B",
    local_files_only=True
)
```

## 部署通道

两个通道，场景不同。

### FastAPI 生产服务

适合集成到业务系统。我们搭了一个完整的 API，带 LRU 缓存、批量接口、监控端点。

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_model()  # 启动时预加载
    yield

app = FastAPI(title="Jev 多维决策 API", lifespan=lifespan)

@app.post("/demo/decide")
async def decide(req: DecideRequest):
    dialog = [{"role": d.role, "content": d.content} for d in req.dialog]
    
    # LRU 缓存
    key = cache_key(dialog)
    if cached := cache_get(key):
        return cached  # 0ms
    
    # 主标签：LoRA 模型
    choice, conf, probs = predict_intent(dialog)
    
    # 副标签：文本信号规则（混合架构）
    sec = predict_secondary(dialog, choice, conf)
    
    # 三档路由
    action, reason = route(choice, conf, sec)
    
    result = {
        "主标签": {"意图": choice, "语义": INTENTS[choice], "置信度": round(conf, 3)},
        "副标签": sec,
        "路由": action,
        ...
    }
    cache_put(key, result)
    return result

@app.post("/demo/decide-batch")
async def decide_batch(req: BatchRequest):
    ...  # 批量处理

@app.get("/stats")
async def stats():
    return {
        "requests": _perf_stats["requests"],
        "avg_latency_ms": round(_perf_stats["total_ms"] / max(_perf_stats["requests"], 1), 1),
        "cache_hit_rate": round(hits / max(hits + misses, 1), 3),
    }
```

实测性能：冷启动 2 秒（模型加载），热请求 1.2 秒，缓存命中 0ms。4bit 量化后显存约 3GB。温度校准后 ECE 从 0.223 降到 0.068。

### Ollama 部署

适合快速体验和独立测试。把模型转 GGUF 导入 Ollama，一条命令就能跑。

GGUF 转换是整个项目最折腾的环节。我们花了两天时间，试了 10 多种方案才跑通。这段经历值得详细写一写，因为坑太典型了。

**手写 gguf.GGUFWriter 的失败经历。** 用 PyPI 的 gguf 包手写转换器，从 safetensors 读权重、自己构造 GGUF 元数据。转出来的文件 Ollama 说 `unable to load model`。

排查发现几个问题：`tokenizer.ggml.model` 写成了 `qwen2`（官方是 `gpt2`）、缺 `tokenizer.ggml.merges`（15 万条 BPE 合并规则）、缺 `chat_template`、vocab 大小写成了 151643（官方 151936）。逐个修了还是不行，因为二进制布局就和官方 converter 不同。

**WSL 跑官方 converter 也超时。** 装了 gguf 库和 transformers，但 torch 装不上（873MB wheel 加 CUDA 依赖，网络超时）。改用 torch-free 方案读 safetensors，但 WSL 的 `/mnt/c` 文件系统 I/O 太慢，15 万条 merges 写入要 10 分钟以上，反复超时。

**最终方案：官方 converter 在 Windows Python 上跑。** Claude Code 帮忙找到了完整的 llama.cpp 转换脚本和 PyTorch 环境。命令是：

```powershell
python convert_hf_to_gguf.py "C:\...\jev-intent-merged" `
  --outfile "jev-intent.gguf" --outtype f16
```

关键教训：**必须用完整的 Hugging Face 目录**（config.json + model.safetensors + tokenizer.json + tokenizer_config.json + chat_template.jinja），不能只拿 safetensors 手写 GGUF。官方 converter 的张量映射、权重类型处理、元数据写入逻辑非常复杂，手写不可能完全复现。

导入 Ollama：

```bash
ollama create jev-intent -f Modelfile
ollama run jev-intent
```

Modelfile 要有 TEMPLATE 字段，否则推理时格式会乱：

```
FROM C:\Users\lc199\Downloads\jev-intent.gguf
TEMPLATE """{{ .System }}
{{ .Prompt }}"""
PARAMETER temperature 0
PARAMETER num_predict 8
SYSTEM "你是意图识别与决策模型"
```

## 部署架构

```
用户请求
   ↓
FastAPI (127.0.0.1:8765)
   ├─ 4bit LoRA 意图模型（Qwen3-0.6B）
   ├─ 8 维中文副标签（文本信号规则）
   ├─ 三档置信度路由
   └─ LRU 缓存（1024 条，命中 0ms）
   ↓
auto → 模板执行
llm  → LLM 生成复核
human → 转人工

Ollama (11434)
   └─ jev-intent（独立体验）
```

## 小结

部署环节的核心教训是：Windows 上的深度学习环境比 Linux 折腾得多，VC++ 依赖、CUDA 版本、bitsandbytes 兼容性每个都可能卡住。GGUF 转换不要手写，用官方 converter 从完整 HF 目录转。冒烟测试不能省，5 分钟能省 2 小时。

下一篇讲数据怎么造、模型怎么训，包括那个 68% 重复率的数据翻车故事。
