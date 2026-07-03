---
title: "house of storm"
date: 2026-05-19 20:51:44
description: "unsorted bin attack 能够通过将目标地址链入 unsorted bin 然后取出其中另一个 chunk 从而在目标地址对应的 bk 写入 `unsorted_chunks (av)` ，然而如果我们想要..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/site-cover.jpg
top_img: /img/site-cover.jpg
---

unsorted bin attack 能够通过将目标地址链入 unsorted bin 然后取出其中另一个 chunk 从而在目标地址对应的 bk 写入 `unsorted_chunks (av)` ，然而如果我们想要将链入 unsorted bin 的 fake chunk 申请出来却通不过检查。这就需要利用 large bin 的特性伪造 fake chunk 的 size 和 fd 字段。这种攻击方式称为 House of storm 。  
漏洞利用条件:

- 需要攻击者在 largebin 和 unsorted_bin 中分别布置一个 chunk 这两个 chunk 需要在归位之后处于同一个 largebin 的 index 中且 unsortedbin 中的 chunk 要比 largebin 中的大。
- 需要 unsorted_bin 中的 bk 指针可控。
- 需要 largebin 中的 bk 指针和 bk_nextsize 指针可控。

