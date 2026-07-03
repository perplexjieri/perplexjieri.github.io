---
title: "large bin attach(2.30以上）"
date: 2026-03-25 21:14:59
description: "很好，这一段就是**“新版本（glibc ≥ 2.30）Large Bin Attack 的核心利用方式”**，而且和你前面学的“旧版本”有一个本质变化： ❗ **不能再随便用 bk 了 → 重点转向 bk_nextsi..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

很好，这一段就是**“新版本（glibc ≥ 2.30）Large Bin Attack 的核心利用方式”**，而且和你前面学的“旧版本”有一个本质变化：

 ❗ **不能再随便用 bk 了 → 重点转向 bk_nextsize**
 
 

