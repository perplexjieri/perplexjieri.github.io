---
title: "house of rabbit"
date: 2026-05-19 20:32:01
description: "第一种攻击方式是利用malloc_consolidate时缺少对fast bin中chunk的size的检查，通过修改fast bin中的chunk的size造成overlap chunk,然后触发malloc_cons..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/article-bg.png
top_img: /img/article-bg.png
---

### 主要有两种攻击方式
第一种攻击方式是利用malloc_consolidate时缺少对fast bin中chunk的size的检查，通过修改fast bin中的chunk的size造成overlap chunk,然后触发malloc_consolidate 使fast  bin清空，从而分配出重叠的堆块。
第二种攻击方式是利用malloc_consolidate将fast bin放入unsorted bin和从进 large bin 以及 large bin 切割 chunk 时对 size 检查不严格从而可以不用严格保证 size 正确的情况下将 fake chunk 申请出来，甚至可以任意地址 malloc 。
首先，要想任意地址 malloc 需要让伪造的 chunk 进入 large bin 的最后一个 bin 那么 size 字段至少为 0x80000 。然而 system_mem 初始默认为 0x21000，因此伪造的 chunk 从 unsorted bin 进入 large bin 时会通不过下面的检查：

|   |   |
|---|---|
|1<br><br>2<br><br>3<br><br>4|`if` `(__builtin_expect (victim->size <= 2 * SIZE_SZ, 0)`<br><br>    `\| __builtin_expect (victim->size > av->system_mem, 0))`<br><br>  `malloc_printerr (check_action,` `"malloc(): memory corruption"``,`<br><br>                   `chunk2mem (victim), av);`|

因此需要想办法增大 system_mem 。

其中一种办法是通过申请和释放大内存增大 mmap_threshold 然后 sbrk 增大 system_mem 。

当申请一块大内存时如果 ptmalloc 找不到合适的内存会调用 sysmalloc 函数向系统获取内存。  
就 main_arena 来说，当调用 sysmalloc 时，ptmalloc 获取内存有直接 mmap 和 brk 扩展 heap 区域两种方式。这两种方式的选择由 mmap_threshold 决定。

|   |   |
|---|---|
|1<br><br>2<br><br>3|`if` `(av == NULL`<br><br>    `\| ((unsigned` `long``) (nb) >= (unsigned` `long``) (mp_.mmap_threshold)`<br><br>    `&& (mp_.n_mmaps < mp_.n_mmaps_max)))`|

只有当所需内存小于 mmap_threshold 时才会调用 brk 扩展内存，system_mem 也才会增加。

|   |   |
|---|---|
|1<br><br>2<br><br>3<br><br>4<br><br>5|`if` `(brk != (``char` `*) (MORECORE_FAILURE))`<br><br>  `{`<br><br>    `if` `(mp_.sbrk_base == 0)`<br><br>      `mp_.sbrk_base = brk;`<br><br>    `av->system_mem += size;`|

因此需要先想办法增大 mmap_threshold 。

当释放一块 ptmalloc 通过 mmap 得到的内存时会将 mmap_threshold 与 chunk 的 size 取最值，因此可以首先通过申请和释放一块大内存将 mmap_threshold 增大。

|   |   |
|---|---|
|1<br><br>2<br><br>3<br><br>4<br><br>5<br><br>6<br><br>7<br><br>8<br><br>9<br><br>10<br><br>11<br><br>12<br><br>13<br><br>14<br><br>15|`if` `(chunk_is_mmapped (p))`                       `/* release mmapped memory. */`<br><br>  `{`<br><br>    `/* see if the dynamic brk/mmap threshold needs adjusting */`<br><br>    `if` `(!mp_.no_dyn_threshold`<br><br>        `&& p->size > mp_.mmap_threshold`<br><br>        `&& p->size <= DEFAULT_MMAP_THRESHOLD_MAX)`<br><br>      `{`<br><br>        `mp_.mmap_threshold = chunksize (p);`<br><br>        `mp_.trim_threshold = 2 * mp_.mmap_threshold;`<br><br>        `LIBC_PROBE (memory_mallopt_free_dyn_thresholds, 2,`<br><br>                    `mp_.mmap_threshold, mp_.trim_threshold);`<br><br>      `}`<br><br>    `munmap_chunk (p);`<br><br>    `return``;`<br><br>  `}`|

之后再次申请一块大内存来增大 system_mem 。

将 fast bin 中的 chunk 的 fd 指向 fake chunk。
将 fake chunk 的 size 置1，是为了避免 malloc_consolidate 时与后面的 chunk 合并时 unlink 出错。因为 size 为 1 时查找的下一个地址相邻的 chunk 是自身。


