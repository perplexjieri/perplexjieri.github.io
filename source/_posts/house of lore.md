---
title: "house of lore"
date: 2026-05-21 21:47:11
description: "在 glibc 内存管理中，Small Bin 是一个**双向链表**，遵循 **FIFO（先进先出）** 机制。 当程序请求一个 Small Bin 大小的内存时，`malloc` 会从链表的尾部（`bk` 指针指向的..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/cover-kurumi.png
top_img: /img/cover-kurumi.png
---

## 1. 核心原理：Small Bin 的分配机制

在 glibc 内存管理中，Small Bin 是一个**双向链表**，遵循 **FIFO（先进先出）** 机制。

当程序请求一个 Small Bin 大小的内存时，`malloc` 会从链表的尾部（`bk` 指针指向的方向）摘出一个 chunk 分配给用户。

正常的 Small Bin 链表结构和卸载（Unlink）过程如下：

- 最后一个空闲 chunk 称为 `victim`。
    
- `bck = victim->bk`（获取 `victim` 的前一个 chunk）。
    
- **安全检查：** `if (__glibc_unlikely(bck->fd != victim))`
    
    - _这句话的意思是：`victim` 的前一个 chunk 的 `fd` 指针，必须指回 `victim` 自己。_
        
- 检查通过后，执行卸载：`bin->bk = bck; bck->fd = bin;`
    

---

## 2. 战术布局：如何绕过 `bck->fd != victim` 检查？

正如你提供的代码片段，House of Lore 的精髓就在于**如何在攻击目标的内存处（如你的 `buf1`）伪造两个假的 chunk（Fake Chunk）**，来完美欺骗这个 `if` 检查。

假设你想控制的目标地址是 `Fake_Chunk1`（即你提到的 `buf1`），你需要提前在内存中布置好两个伪造的结构体：

### 伪造链表布局

1. **Fake_Chunk1 (`buf1`)**：它的 `bk` 指针必须指向另一个你可以控制的干净内存 **`Fake_Chunk2`**。
    
2. **Fake_Chunk2**：它的 `fd` 指针必须**指回 `Fake_Chunk1`**。
    

### 攻击发生时的篡改

当你通过漏洞（例如 Heap Overflow 或 Use-After-Free）篡改了已经在 Small Bin 中的真实 chunk（`victim`）的 `bk` 指针，将其修改为指向 `Fake_Chunk1` 时，链表变成了这样：

`Small Bin 头部` $\leftrightarrow$ `victim` $\rightarrow$ **`Fake_Chunk1`** $\rightarrow$ **`Fake_Chunk2`**

### 绕过检查的数学逻辑

当 `victim` 被申请走后，下一次分配的目标将变成 `Fake_Chunk1`。此时：

1. `victim` 变成了当前的 `Fake_Chunk1`。
    
2. 触发代码 `bck = victim->bk;` $\rightarrow$ 此时 `bck` 实际指向 **`Fake_Chunk2`**。
    
3. 触发安全检查：`if (bck->fd != victim)` $\rightarrow$ 即检查 `Fake_Chunk2->fd != Fake_Chunk1`。
    
4. 因为我们提前在 `Fake_Chunk2->fd` 写入了 `Fake_Chunk1` 的地址，**条件不成立（相等），完美绕过检查！**

