---
title: "饶过tcache(版本大于2.26）"
date: 2026-03-25 21:32:40
description: "如果想让释放的 chunk 不进入 tcache 有如下方法： - 释放不在 tcache 大小范围的 chunk。 - 释放 7 个同样大小的 chunk 进入 tcache 填满对应位置的 bin。"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

# 绕过 tcache

如果想让释放的 chunk 不进入 tcache 有如下方法：

- 释放不在 tcache 大小范围的 chunk。
    
    |   |   |
    |---|---|
    |1<br><br>2<br><br>3<br><br>4<br><br>5<br><br>6<br><br>7|`add_chunk(``0``,` `0x410``)`<br><br>`add_chunk(``1``,` `0x10``)`<br><br>`delete_chunk(``0``)`<br><br>`gdb.attach(p)`<br><br>`p.interactive()`|
    
- 释放 7 个同样大小的 chunk 进入 tcache 填满对应位置的 bin。
    
    |   |   |
    |---|---|
    |1<br><br>2<br><br>3<br><br>4<br><br>5<br><br>6<br><br>7<br><br>8<br><br>9<br><br>10<br><br>11<br><br>12<br><br>13|`for` `_` `in` `xrange``(``7``):`<br><br>    `add_chunk(_,` `0x68``)`<br><br>`add_chunk(``7``,` `0x68``)`<br><br>`for` `_` `in` `xrange``(``7``):`<br><br>    `delete_chunk(_)`<br><br>`delete_chunk(``7``)`<br><br>`gdb.attach(p)`<br><br>`p.interactive()`|
    
- 如果题目限制了 free 次数那么需要通过 tcache dup 再 malloc 3 次将 counts 对应位置置为 -1 来绕过 tcache 。
    
    |   |   |
    |---|---|
    |1<br><br>2<br><br>3<br><br>4<br><br>5<br><br>6<br><br>7<br><br>8<br><br>9<br><br>10<br><br>11<br><br>12|`add_chunk(``0``,` `0x68``)`<br><br>`delete_chunk(``0``)`<br><br>`delete_chunk(``0``)`<br><br>`add_chunk(``0``,` `0x68``)`<br><br>`add_chunk(``0``,` `0x68``)`<br><br>`add_chunk(``0``,` `0x68``)`<br><br>`delete_chunk(``0``)`<br><br>`gdb.attach(p)`<br><br>`p.interactive()`|
    
- 控制 `tcache_perthread_struct` 从而控制 counts 实现绕过 tcache 。
- 
每个 thread 都会维护一个 `tcache_perthread_struct` ，它是整个 `tcache` 的管理结构，一共有 `TCACHE_MAX_BINS` 个计数器和 `TCACHE_MAX_BINS` 项 `tcache_entry`。这个结构在 `tcache_init` 函数中被初始化在堆上，大小为 0x250（高版本为 0x290）。其中数据部分前 0x40 为 `counts` ，剩下的为 `entries` 结构。如果能控制这个堆块就可以控制整个 `tcache` 。
