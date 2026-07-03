---
title: "calloc源码分析"
date: 2026-03-18 21:42:46
description: "1.计算总大小+溢出检查 2.尝试malloc hook 3.调用malloc分配内存 4.按需清零 bytes = n * elem_size; 👉 要申请的总字节数 if ((n | elem_size) >= H..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/cover-kurumi.png
top_img: /img/cover-kurumi.png
---

### 1.这段代码的是libc中calloc的核心实现，它的作用是：分配内存+自动清零
### 总体流程
1.计算总大小+溢出检查 
2.尝试malloc hook
3.调用malloc分配内存
4.按需清零
## 1️⃣ 计算申请大小 + 溢出检查

bytes = n * elem_size;

👉 要申请的总字节数

### 🔥 关键：防止整数溢出

if ((n | elem_size) >= HALF_INTERNAL_SIZE_T)  
{  
    if (elem_size != 0 && bytes / elem_size != n)

### ✔ 原理：

- 如果 `n * size` 溢出：
    
    bytes / size != n
    
- 用这个来检测乘法是否溢出
    

### 📌 为什么加 `(n | elem_size)` 判断？

优化性能：

- 小数直接跳过检查
    
- 大数才做除法验证（除法慢）
## 2️⃣ malloc hook（调试/劫持机制）

void *(*hook) (...) = __malloc_hook;

如果 hook 存在：

mem = (*hook)(sz, ...);  
return memset(mem, 0, sz);

👉 直接走 hook，不走 glibc 正常分配逻辑

📌 用途：

- 调试
    
- 内存跟踪
    
- exploit（早期）
## 3️⃣ 获取 arena（线程相关）

arena_get(av, sz);

👉 glibc 多线程优化：

- 每个线程有 arena
    
- 避免锁竞争
## 4️⃣ 处理 top chunk（关键优化点）

oldtop = top(av);  
oldtopsize = chunksize(top(av));

👉 top chunk = 堆顶未使用空间

---

### ❗ 为什么关心 top chunk？

因为：

> **新扩展的内存（sbrk / mmap）本来就是 0**

所以：

👉 可以**少清零一部分**
### ✔ 两种情况：

#### 🟢 main_arena（主堆）

oldtopsize = heap 末尾 - oldtop

#### 🟢 非主 arena（线程堆）

oldtopsize = heap_info 可用范围
## 5️⃣ 真正分配内存

mem = _int_malloc(av, sz);

👉 核心 malloc 实现（ptmalloc）
### ❗ 如果失败

arena_get_retry(...)

👉 换 arena 再试一次
## 6️⃣ mmap 情况（重要分支）

if (chunk_is_mmapped(p))

👉 如果是 mmap 分配：

✔ 特性：

- 内核保证返回 **全 0**
    
- 所以：
    

return mem;

🚀 不需要 memset（省时间）
## 7️⃣ 计算需要清零的大小

csz = chunksize(p);  
clearsize = csz - SIZE_SZ;

👉 为什么减 `SIZE_SZ`？

因为：

- chunk 前面有 metadata（头部）
    
- 不需要清零
## 8️⃣ top chunk 优化（再次优化）

if (p == oldtop && csz > oldtopsize)  
    csz = oldtopsize;

👉 含义：

- 如果内存来自 top chunk
    
- 且部分是“新扩展的 0 内存”
    

👉 那么：

👉 **只清旧内存部分**

🚀 再次减少 memset

