---
title: "fast bin attach"
date: 2026-03-22 20:12:28
description: "劫持fast bin 链表中chunk的fd指针，把fd指针指向我们想要分配的地址处，从而控制一些关键数据，比如返回地址等 fd指向的内存能申请出来的前提是该内存对应size处的值与该fast bin对应size相同"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

劫持fast bin 链表中chunk的fd指针，把fd指针指向我们想要分配的地址处，从而控制一些关键数据，比如返回地址等 
fd指向的内存能申请出来的前提是该内存对应size处的值与该fast bin对应size相同

检查机制：
`#define SIZE_BITS (PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA)`

`/* Get size, ignoring use bits */`

`#define chunksize(p) ((p)->size & ~(SIZE_BITS))`

`/* offset 2 to use otherwise unindexable first 2 bins */`

`#define fastbin_index(sz) \`

    `((((unsigned` `int``) (sz)) >> (SIZE_SZ == 8 ? 4 : 3)) - 2)`

        `idx = fastbin_index(nb);`

        `...`

`/* Get size, ignoring use bits */`

`#define chunksize(p)         ((p)->size & ~(SIZE_BITS))`

            `if` `(__builtin_expect(fastbin_index(chunksize(victim)) != idx, 0)) {`

                `errstr =` `"malloc(): memory corruption (fast)"``;`

                `errout:`

                `malloc_printerr(check_action, errstr, chunk2mem(victim), av);`

                `return` `NULL;`

            `}`

由于这里的size不考虑低3比特，并且libc或栈地址；多数是0x7f开头，因此可以通过截取0x7f然后用0x70的fast bin将该内存申请出来
例如修改 fd 指针指向 `__realloc_hook` 前合适的偏移通常是 `__malloc_hook` 往前 0x23 的偏移），两次 `malloc(0x60)` 申请出该地址的 fake chunk 实现对 `__realloc_hook` 和 `__malloc_hook` 的控制。



