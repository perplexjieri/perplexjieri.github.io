---
title: "house of io"
date: 2026-04-10 22:12:32
description: "其实就是对 `tcache_perthread_struct` 结构体的攻击，想办法将其释放掉，然后再申请回来，申请回来的时候就能控制整个 tcache 的分配。"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/site-cover.jpg
top_img: /img/site-cover.jpg
---

其实就是对 `tcache_perthread_struct` 结构体的攻击，想办法将其释放掉，然后再申请回来，申请回来的时候就能控制整个 tcache 的分配。

