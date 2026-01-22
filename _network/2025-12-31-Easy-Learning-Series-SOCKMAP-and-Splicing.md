---
layout: knowledge-base
title: Easy Learning Series-SOCKMAP and Splicing
subtitle: Kernel-level Network Optimization Techniques
date: 2025-12-31 11:00:00 +0900
categories:
- network
taxonomy:
  category: network
  subcategory: network-kernel
  order: 2
difficulty: intermediate
keywords:
- SOCKMAP
- Splicing
- TCP
- Kernel Networking
- Zero-copy
relationships:
  related:
  - _network/2025-12-26-굴비와-예제로-공부해보는-SOCKMAP과-스플라이싱.md
  references: []
  prerequisite: []
  extends: []
  comparison: []
---

# TCP Splicing: Gotcha, you reverse proxy!

Reverse proxies like NGINX and HAProxy, which are commonly used from undergraduate labs to the field, are inherently L7 proxies. Because they involve frequent data transfer between the kernel and user space, they fundamentally cannot push performance to its absolute limit from the start.

In other words, among various techniques to reduce copy costs, the most powerful one is to keep as much work as possible in kernel space. Cloudflare describes SOCKMAP as a "holy grail" for performance in certain proxy workloads, and even calls it a "tectonic shift".

Before getting to SOCKMAP, I’ll start with splice-style approaches to see how far you can push more traditional user-space designs.

## What makes traditional optimization better than L7 proxies?

I’d like to use a **solid metaphor** here.
Imagine you are a **woodchopper** and you need to move as many logs as required. Your client wants you to move a massive amount of logs.

Let's say there are two methods:

1. Moving each log one by one into baskets, handing them to a packaging company, which then stacks them separately in a truck to send.
2. Pre-tying the logs into **bundles**, putting them straight into a box of appropriate size, and using our own cooperative's truck.

When there are 120 logs, in Case 1, you'd have to pack 120 boxes one by one, hand them to the packager, and transport them by truck.
In Case 2, you pack 6 bundles (1 bundle = 20 logs) into the largest box and send them via our own truck.

Even excluding the time saved by not transferring cargo to a packager, if we assume a box only fits 1 log-bundle, one bundle is treated like one log, making it 20 times faster. If the order volume is small enough to find a box that fits all 6 bundles, the time required is 1—meaning it's 120 times faster than Case 1.

This alone shows it's a change worth calling a "seismic shift" in high-load environments. Even if we consider a median value between the worst case (all boxes fit only 1 bundle) and the best case (all bundles fit in one box), and exclude the shipping consignment, the speed is roughly `(6+1)/2 == 3.5; 120/3.5 == approx 34.28x`, which is sufficiently powerful.

I can see why the Cloudflare blog called it a seismic shift. Now, let’s compare the functions usually used for this.

## What kind of functions are available?

This is where things get interesting as we can see the comparison of `sendfile` vs `splice` vs `vmsplice`.

`sendfile` reads from a disk file to a socket. It’s not zero-copy, but it avoids user space memory copying, focusing on Disk -> Socket transfer. To use the metaphor again, it’s like taking log bundles out of a cold storage warehouse, putting them in a box, and loading them onto the cooperative's truck.

`splice` reads from a pipe to a socket and performs zero-copy for both network socket copying and its reverse. This is like taking logs from the employee at the warehouse and shoving them into the truck via a **high-speed conveyor belt with almost zero transit time** that shoves them into the truck. When returning, you take the cargo from the client and load the logs again. It’s clear why Linus didn't prefer `sendfile`. (Note: unless `SPLICE_F_MOVE` is used, copies are sometimes mixed in).

`vmsplice` carries data from a memory area (especially a virtually continuous memory space) to a pipe. You can't avoid user space memory, but it is zero-copy. This is like using a consignment delivery service, but the company's truck is right next door, so you plug it in with a high-speed belt.

If you need to use a virtual continuous memory area, use `vmsplice`; otherwise, `splice` should do. If memory is scarce, `vmsplice` is good, but you must accept trade-offs in performance, such as page alignment issues, so you have to handle it.

## Then what were NGINX, HAProxy doing?

In fact, these two handle different parts and have different reasons for how they do things, so we can't say one is superior. However, a brief introduction will help you understand what they were thinking.

**NGINX** can be summarized like this: If a certain place frequently takes Pine logs, remember what they take and immediately give them **"Company X's Pine logs."** This method is fast because it doesn't need to reload information every time, but there's a risk of giving Company X's logs even when they unexpectedly need Oak logs. If you’ve ever experienced a caching issue, it will be easier to feel how similar this situation is.

**HAProxy** can be seen as using various routes. When you need large-scale transport, there are various routes between two points. Since some routes might require driving on narrow roads, HAProxy aims to deliver the logs on time by operating trucks through various pathways to avoid traffic jams.

While these are excellent approaches in that they don't directly call kernel APIs, it’s common sense that shortening the actual path makes the transport faster.

## Naive vs Splice via Python Examples

### Naive (Without Splice)

```python
while data:
    data = read(sd, 4096)
    writeall(sd, data)

```

### Splice

```python
pipe_rd, pipe_wr = pipe()
fcntl(pipe_rd, F_SET_PIPE_SZ, 4096) # In our metaphor, 4096 logs make 1 bundle
while n:
    n = splice(sd, pipe_wr, 4096)
    splice(pipe_rd, sd, n)

```

In this case, if a situation arises where several bundles can be sent at once, the `splice` function will bundle them together. Since the API is already well-made, you can implement this easily without destructive modifications.

## SOCKMAP: eBPF rules all.

Now we are focusing on the main point. From here, the approach is completely different from user-space proxying. First, let’s use a metaphor for SOCKMAP.

This is truly an elegant method. (The metaphor is exaggerated, of course.) **SOCKMAP can feel like a teleport fast path**: imagine building a high-speed train between the factory and the client, moving data without relying on the slow truck route.

In a typical user-space proxy, data often bounces between user space and the kernel and goes through buffering paths. With eBPF + SOCKMAP, you can build a much shorter in-kernel forwarding path.

In the SOCKMAP API, we will try using the `bpf_sk_redirect_map` part, but before that, let's look at what eBPF is.

## What is eBPF?

eBPF (Extended Berkeley Packet Filter) lets you run verified programs inside the Linux kernel at various hook points (e.g., XDP, tc, cgroup, tracing, and socket-related hooks) without rebuilding the kernel.

In practice, it enables packet processing, observability, and socket I/O redirection while avoiding a lot of user↔kernel context switching and copying.

According to a Netflix post, in their production use case the overhead was typically under ~1% on most instances. With that kind of cost profile, you can add functionality in the kernel without constantly shuttling data through user space.

## What is SOCKMAP?

This is a modern API designed for direct communication between sockets within the kernel space. The method of mapping each socket with this is simple, unlike conventional wisdom in kernel development, and if you narrow it down to communication for a specific purpose, the code can be finished very briefly. We will find functions here. Please follow the lines and catch the structure.

[eBPF Documentation](https://docs.ebpf.io/linux/helper-function/)
We will follow the "Redirect helpers" in "Network helpers," refer to the documentation, and write code to open a network socket at `127.0.0.1:8080`. What we want is to redirect messages coming from `127.0.0.1:8080` to a **socket**.
Then the candidates we need to look at are narrowed down.

We will focus on those that look like basic forms for our purpose, those with the `sk_` tag, and especially those **without exceptions** (such as "overriding general behavior"). When filtered, the list looks like this:

```c
bpf_clone_redirect
bpf_sk_redirect_map
bpf_redirect
bpf_redirect_map
bpf_sk_redirect_hash
bpf_msg_redirect_map
...

```

Overall, these are useful for tasks like immediately "plugging in" messages coming into a specific socket—for example, in a server that receives specific control packets from the outside. If you are interested in using eBPF for other purposes, you can simply check the docs.

Let's cherry-pick a few and see how to read the docs.

## bpf_redirect_map

There's an explanation in the Definition section. The description of this function contains information that it redirects packets to an endpoint referenced by the index key of a specific map. It **specifies the purpose**, stating that this map includes network devices or CPUs. It also provides **flags for specific actions** like `BPF_F_BROADCAST`, and informs that `bpf_redirect` is a **function that operates under fewer conditions**, needing only `ifindex` instead of a map index. This Definition alone compresses everything from an Overview to Further Links.

The Returns part is clearly explained even for beginners.

```c
// XDP_REDIRECT on success, or the value of the two lower bits of the flags argument on error.
static long (* const bpf_redirect_map)(void *map, __u64 key, __u64 flags) = (void *) 51;

```

When there is no error: `XDP_REDIRECT`. On error, you can see it gives a copy of the lower 2 bits. Therefore, the code pattern becomes as follows:

```c
// bpf_printk is for debugging; replace with ring buffer for production.
long ret = bpf_redirect_map(&tx_port, key, 0);
if (ret != XDP_REDIRECT) {
    bpf_printk("bpf_redirect_map failed: ret=%ld", ret);
    return XDP_ABORTED;
}

```

As such, just by reading the API well, you can grasp how to write the code pattern and what role it plays.

### Looking at Abbreviations

Abbreviations are common: `sk` is used for **socket**, `msg` is used for **message**, etc.

### bpf_sk_redirect_map

Let's translate this into plain English.

* This BPF function does something.
* This is doing something for a socket.
* This is redirecting ___ by a map.


"___" can be naturally inferred as "the packet referenced" if you're in a related field. Combining it again: "This BPF function redirects the socket referenced by the map."

Also, it guides you through flags for selecting specific ingress paths like `BPF_F_INGRESS`, just like high-level languages. The docs list `Program types` and `Map types` so you won't get lost.

## Benchmark Results

```bash
yjlee@yjlee-linuxonmac:~/cloudflare-study/ebpf-sockmap$ sudo ./echo-sockmap 127.0.0.1:8080
[+] Accepting on 127.0.0.1:8080 busy_poll=0
[+] rx=102400001 tx=0
^C
yjlee@yjlee-linuxonmac:~/cloudflare-study/ebpf-sockmap$ sudo ./echo-naive 127.0.0.1:8080
[+] Accepting on 127.0.0.1:8080 busy_poll=0
[-] edge side EOF
[+] Read 97.7MiB in 1075.9ms
^C
yjlee@yjlee-linuxonmac:~/cloudflare-study/ebpf-sockmap$ sudo ./echo-splice 127.0.0.1:8080
[+] Accepting on 127.0.0.1:8080 busy_poll=0
[-] edge side EOF
[+] Read 97.7MiB in 1064.3ms
^C

```

SOCKMAP is fast enough that it’s easier to express throughput using `tx/rx` counters. In this run, `splice` improved only slightly (~11ms best-case). This matches the intuition: if you can build a true in-kernel fast path, the difference can be much larger than what you get from “better user-space piping.”

This can be attractive for high-throughput proxies and service networks.

To try it yourself, check out this example which is assembly-optimized for ARM64 machines and improved to specify the attach type when attaching to the kernel:
[Benchmark Source](https://github.com/gg582/cloudflare-study/tree/main/ebpf-sockmap)

It's a valuable resource to glimpse the code conventions and quality of a large corporation. Read it thoroughly and look for further improvements; it will be a good study.

## Closing

The log-bundle metaphor helped me understand why splice and SOCKMAP feel fundamentally different. I’ll keep posting notes as I explore more eBPF networking topics.
