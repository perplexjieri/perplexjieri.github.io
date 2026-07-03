---
title: "house of botcake"
date: 2026-04-13 22:10:07
description: "同一个 chunk 释放到 tcache 和 unsorted bin 中。释放在 unsorted bin 的 chunk 借助堆块合并改变大小。相对于上一个方法，这个方法的好处是一次 double free 可以多次..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

同一个 chunk 释放到 tcache 和 unsorted bin 中。释放在 unsorted bin 的 chunk 借助堆块合并改变大小。相对于上一个方法，这个方法的好处是一次 double free 可以多次使用，因为控制同一块内存的 chunk 大小不同。

