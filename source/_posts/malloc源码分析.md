---
title: "malloc源码分析"
date: 2026-03-16 22:06:46
description: "- 首先在 _libc_malloc 函数中先判断 __malloc_hook 函数指针是否为空，如果不为空则调用 __malloc_hook 函数。 - 如果存在tcache且有相应大小的chunk则将其从tcache..."
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/site-cover.jpg
top_img: /img/site-cover.jpg
---

### 关键过程
- 首先在 _libc_malloc 函数中先判断 __malloc_hook 函数指针是否为空，如果不为空则调用 __malloc_hook 函数。
- 如果存在tcache且有相应大小的chunk则将其从tcache中取出并返回结果
- 调用int malloc函数
      首先将申请的内存的字节数转化为chunk的大小
      如果arena未初始化，则调用sysmalloc向系统申请内存，然后将获取的chunk返回
      如果申请的chunk大小不超过fast bin的最大值，则尝试从对应的fast bin的头部获取chunk后，如果对应的fast bin还有chunk并且大小在tcache范围就将它们依次从头节点取出放到tcache中，直到把tcache放满。最后将申请到的chunk返回。
      - 如果申请的 chunk 在 small bin 大小范围则进行与 fast bin 一样的操作，只不过这次取 chunk 是依次从链表尾部取。
      - - 如果申请的 chunk 在 large bin 大小范围则调用 malloc_consolidate 函数将 fast bin 中的 chunk 合并后放入 unsorted bin 。
      - 循环进行如下操作：
      -   循环取unsorted bin最后一个chunk
      -        如果用户的请求为small bin chunk,那么我们首先考虑last reminder,如果当前chunk是last remainder,且last reminder是unsorted bin中的唯一一个chunk，并且last reminder的大小分割后还可以作为一个chunk,则从last reminder中切下一块内存返回
      - - 如果 chunk 的大小恰好等于申请的 chunk 大小，则如果该内存大小在 tcache 范围且 tcache 没有满，则先将其放入 tcache，之后会考虑从 tcache 中找 chunk 。否则直接将找到的 chunk 返回。
      - 根据chunk大小将其放入small bin或large bin中。对于small bin,首先特判加入链表尾部的情况，如果不在链表尾部则从头部遍历找位置，如果large bin中有与加入的chunk大小相同的chunk,则加到第一个相等chunk后面，否则加到合适位置后还需要更新nextsize指针
      - 尝试从tcache找chunk
      - 如果循环超过10000次则跳出循环
      - - 尝试从 tcache 找 chunk 。
      - 如果申请chunk大小不在small bin 范围，则从后往前遍历对应large bin ,找到第一个不小于申请chunk大小的chunk。为了unlink时避免修改nextsize的操作，如果存在多个合适的chunk则选第二个chunk.如果选取的chunk比申请的chunk大不少于MINSIZE，则需要将多出来的部分切出来作为remiander,并将其加入unsorted bin头部。然后将获取的chunk返回。
      - 找一个chunk范围比申请chunk大的非空bin里面找最后一个chunk,这个过程用binmap优化，同时也可以更新binmap的状态。这个chunk上切下所需的chunk,剩余部分放入unsorted bin头部。然后将获取的chunk返回。
      - 如果top chunk切下所需chunk剩余部分还是不小于MINSIZE则从top chunk上切下所需chunk返回
      - - 如果 fast bins 还有 chunk 则调用 malloc_consolidate 合并 fast bin 中的 chunk 并放入 unsorted bin 中，然后继续循环。
      - 最后 sysmalloc 系统调用向操作系统申请内存分配 chunk
             - 如果 arena 没有初始化或者申请的内存大于 mp_.mmap_threshold，并且 mmap 的次数小于最大值，则使用 mmap 申请内存。然后检查一下是否 16 字节对齐然后更新 mmap 次数和 mmap 申请过的最大内存大小后就将 chunk 返回。

    - 如果 arena 没有初始化就返回 0
    - 对之前的 top chunk 进行检查，如果是 dummy top 的话，因为是用 unsorted bin 表示的，因此 top chunk 的大小需要是 0 。否则堆的大小应该不小于 MINSIZE，并且前一个堆块应该处于使用中，并且堆的结束地址应该是页对齐的，由于页对齐的大小默认是 0x1000，所以低 12 个比特需要为 0。除此之外，top chunk 大小必须比申请 chunk 大小加上 MINSIZE 要小。
    - 如果 arena 不是 main arena
    - - 尝试将 top chunk 所在的 heap 扩展大小，如果成功则更新 arena 记录的内存总大小 system_mem 和 top chunk 大小。
    - - 尝试申请一个新的 heap 。设置新的 heap 以及 arena 的参数并且将原来的 top chunk 先从尾部切下 2 个 0x10 大小的 chunk ，剩余部分如果不小于 MINSIZE 则将其释放掉。
      - 否则，如果前面没有执行到 mmap 申请 chunk 的分支就尝试执行。
      - 如果 arena 是 main arena
            - 计算需要获取的内存大小。需要获取的内存大小等于申请的 chunk 大小加上 0x20000 和 MINSIZE 。如果堆空间连续，则可以再减去原来内存的大小。然后将需要获取的内存大小与页大小对齐。
            -  sbrk 扩展内存如果成功则会尝试调用一个 hook 函数，否则 mmap 申请内存，然后 brk 移到申请的内存处并设置堆不连续参数。
            -  如果成功获取到内存，则更新 arena 记录的内存总大小 system_mem 和 sbrk_base。之后对一系列的情况进行处理，在这期间，之前的 top chunk 会被从尾部切下两个 0x10 大小的chunk，剩余部分如果不小于 MINSIZE 则将其释放掉。
            - 最后从新获取的 top chunk 上切下所需的 chunk 并返回。


### 源码分析

`assert` `(!victim || chunk_is_mmapped (mem2chunk (victim)) ||`

          `ar_ptr == arena_for_chunk (mem2chunk (victim)));`

  ‘//确保只有三种情况，即要么没申请成功，要么是通过mmap获取的内容，要么是从当前线程对应的thread_arena 管理的内存中获取的’

  `return` `victim;`
//返回到申请的内存
#### int_malloc 
`static` `void` `* _int_malloc (mstate av,` `size_t` `bytes) {`

  `INTERNAL_SIZE_T nb;`               `/* 请求的chunk_size */`

  `unsigned` `int` `idx;`                 `/* 对应bin数组中的index */`

  `mbinptr bin;`                      `/* 指向对应bin的指针 */`

  `mchunkptr victim;`                 `/* 指向分配的chunk */`

  `INTERNAL_SIZE_T size;`             `/* 分配的chunk的size */`

  `int` `victim_index;`                 `/* 分配的chunk的bin的index */`

  `mchunkptr remainder;`              `/* 指向分割后剩下的那块chunk */`

  `unsigned` `long` `remainder_size;`     `/* 分割后剩下的那块chunk的size */`

  `unsigned` `int` `block;`               `/* bit map traverser */`

  `unsigned` `int` `bit;`                 `/* bit map traverser */`

  `unsigned` `int` `map;`                 `/* 一个block值 */`

  `mchunkptr fwd;`                    `/* 用于链表操作 */`

  `mchunkptr bck;`                    `/* 用于链表操作 */`

  `const` `char` `*errstr = NULL;`        `/* 报错字符串指针 */`

  `checked_request2size (bytes, nb);` `/* 计算chunk_size */`
  







