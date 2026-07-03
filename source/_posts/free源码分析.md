---
title: "free源码分析"
date: 2026-03-18 20:30:43
description: "如果说sysmallloc是向系统要钱，那么这段代码就是负责还钱以及把钱存进不同的钱包。 如果free hook被设置，free不会执行正常逻辑 直接调用hook 经典利用 覆盖free hook=system"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/site-cover.jpg
top_img: /img/site-cover.jpg
---

### 形象的概括
如果说sysmallloc是向系统要钱，那么这段代码就是负责还钱以及把钱存进不同的钱包。
### 1.libc free
如果free hook被设置，free不会执行正常逻辑
直接调用hook
 经典利用
        覆盖free hook=system
        然后free("bin/sh")
### 2.null处理
标准行为：free（null)无效果
### 3.mmap chunk处理
大块内存直接mumap
不进入bin管理
### 4.普通chunk
进入核心函数int free
### int free核心逻辑
可以分成六个阶段
# ① 基础安全检查

if (misaligned_chunk || size非法)  
    error

### 检查内容：

- 指针是否合法
    
- size >= MINSIZE
    
- 对齐正确
    

👉 防止：

- fake chunk
    
- 野指针
# ② fastbin 路径（小chunk）

条件：

size <= get_max_fast()

---

## fastbin 的关键特点：

### ✔ 单链表

p->fd = old;

### ✔ LIFO（后进先出）

---

## ⚠️ 关键安全检查

### 1. double free

if (old == p)  
    error

👉 fastbin double free 检测（但不完全）
### 2. lock-free 插入

catomic_compare_and_exchange_val_rel

👉 无锁 CAS 操作

---

### ⚠️ 利用点（经典）

- fastbin dup
    
- fastbin attack
    
- 覆盖 fd 指针
# ③ 非 fastbin 路径（normal bin）

进入：

if (!chunk_is_mmapped(p))

---

## 先加锁

mutex_lock(&av->mutex)
# ④ 合并（核心机制🔥）

---

## 向前合并（backward consolidation）

if (!prev_inuse(p))

👉 前一个 chunk 是 free：

p = prev_chunk  
size += prevsize  
unlink(prev)
## 向后合并（forward consolidation）

if (!nextinuse)

👉 后一个 chunk 是 free：

unlink(next)  
size += nextsize
# ⑤ 插入 unsorted bin

bck = unsorted_chunks(av);  
p->fd = fwd;
p->bk = bck;
👉 所有合并后的 chunk：

➡️ 先进入 unsorted bin  
➡️ 再在 malloc 时分流
## ⚠️ 关键检查

if (fwd->bk != bck)  
    corrupted unsorted chunks

👉 防止链表破坏
## ⚠️ 利用点（非常重要🔥）

### unsorted bin attack：

利用：

p->bk = target

写任意地址：

*(target + offset) = value
# ⑥ top chunk 合并

if (nextchunk == av->top)

👉 当前 chunk 与 top 相邻：

av->top = p;
# ⑦ 大块触发整理

if (size >= FASTBIN_CONSOLIDATION_THRESHOLD)

默认：64KB

---

## 做两件事：

### 1. fastbin 合并

malloc_consolidate(av);

---

### 2. 尝试归还系统内存

systrim()
# 四、`systrim`：归还内存给 OS

---

## 条件

top chunk 足够大
## 核心逻辑：

### 1. 计算可释放大小

extra = ALIGN_DOWN(...)

必须是页大小整数倍

---

### 2. 调用：

sbrk(-extra)

👉 真正把内存还给 OS
### 3. 更新：

av->system_mem -= released  
top chunk size 减少
## 🔷 free 做了什么？

### 1️⃣ 分类处理

- fastbin
    
- normal bin
    
- mmap
    

---

### 2️⃣ chunk 合并（防碎片）

- backward
    
- forward
    

---

### 3️⃣ bin 管理

- fastbin（单链表）
    
- unsorted bin（双链表入口）
    

---

### 4️⃣ 内存回收

- top chunk
    
- systrim → sbrk

### 从漏洞利用点看
## ⚠️ 1. fastbin attack

控制：

p->fd

实现：

- 任意地址分配
## ⚠️ 2. double free

绕过：

if (old == p)

构造：

- fastbin dup
## ⚠️ 3. unlink attack（旧版本）

利用：

unlink(av, p)

写：

bk->fd = fd  
fd->bk = bk
## ⚠️ 4. unsorted bin attack

控制：

bk

实现：

- 任意写
## ⚠️ 5. __free_hook 劫持（最经典）

__free_hook → system

触发：

free("/bin/sh")
# 七、一句话总结

👉 `free()` 本质是：

> **把 chunk 放回合适的 bin，并尽可能合并，再在必要时把内存还给操作系统**

但在实现过程中：

> ⚠️ 大量“指针操作 + 链表操作 + 不完全检查”  
> → 成为堆利用（heap exploitation）的核心入口


