---
title: "large bin attach(2.30以前）"
date: 2026-03-24 20:39:08
description: "large bin bin_head ↓ [H] ↓ fd [A] <------> [B] <------> [C] ↑ ↑ ↑ └──── bk ────┴──── bk ────┘"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/site-cover.jpg
top_img: /img/site-cover.jpg
---

# 一、初始状态（正常 large bin）

          large bin  
  
   bin_head  
      ↓  
     [H]  
      ↓ fd  
     [A] <------> [B] <------> [C]  
      ↑            ↑            ↑  
      └──── bk ────┴──── bk ────┘

同时（size链）：

fd_nextsize / bk_nextsize：  
  
[A] <------> [B] <------> [C]

---

# 二、我们控制一个 chunk（关键起点）

假设你控制了：

[B]  ← 可控 chunk

你做两件事👇

---

## ✏️ 篡改指针

B->bk_nextsize = TARGET_ADDR - OFFSET

（OFFSET 是为了对齐 fd_nextsize 字段）

---

## 此时结构（关键变化）

正常链表（看起来没问题）：  
  
[A] <-> [B] <-> [C]  
  
但是！  
  
B->bk_nextsize ───────────────► [TARGET]

---

# 三、准备触发攻击

👉 你再 free 一个更大的 chunk：

victim = 新 chunk

---

# 四、glibc 开始插入 victim（关键阶段）

代码执行：

victim->bk_nextsize = fwd->bk_nextsize;

此时：

fwd = B  
  
所以：  
  
victim->bk_nextsize = B->bk_nextsize  
                     = TARGET

---

# 五、关键一跳（指针接力）

victim  
   │  
   └── bk_nextsize ───► TARGET

---

# 六、触发“致命写入”（核心）

执行这句：

victim->bk_nextsize->fd_nextsize = victim;

---

## 展开来看👇

victim->bk_nextsize = TARGET

所以：

TARGET->fd_nextsize = victim

---

# 七、最终效果（任意地址写）

[TARGET + offset] = victim

💥 完成任意写！

---

# 八、全过程总图（最重要）

① 控制 B：  
  
[A] <-> [B] <-> [C]  
         │  
         └──── bk_nextsize ─────► TARGET  
  
② 插入 victim：  
  
victim  
   │  
   └── bk_nextsize = TARGET  
  
③ 触发写：  
  
TARGET->fd_nextsize = victim

