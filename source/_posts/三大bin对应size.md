---
title: "三大bin对应size"
date: 2026-03-21 17:22:02
description: "👉 条件： chunk_size ≤ 0x80 👉 推回 malloc size： malloc size ≤ 0x70 malloc(0x10) malloc(0x20) malloc(0x40)"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

## ✅ 1. fastbin

👉 条件：

chunk_size ≤ 0x80

👉 推回 malloc size：

malloc size ≤ 0x70

### ✔ 常用申请：

malloc(0x10)  
malloc(0x20)  
malloc(0x40)  
malloc(0x60)  
malloc(0x70)

---

## ✅ 2. small bin

👉 条件：

0x90 ≤ chunk_size ≤ 0x400

👉 推回 malloc size：

0x80 ≤ malloc size ≤ 0x3f0

### ✔ 常用申请：

malloc(0x80)  
malloc(0x100)  
malloc(0x200)  
malloc(0x208)  ← 你题里的

---

## ✅ 3. unsorted bin

👉 条件：

free 后先进入 unsorted bin（只要不是 fastbin）

👉 所以：

malloc size ≥ 0x80

都可以进 unsorted bin（free 时）

