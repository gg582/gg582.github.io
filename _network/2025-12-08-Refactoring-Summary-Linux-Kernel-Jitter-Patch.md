---
layout: knowledge-base
title: "Refactoring Summary: Linux Kernel Jitter Patch"
subtitle: "From dst_entry bloat to struct dst_power abstraction"
date: 2025-12-08 21:00:00 +0900
categories: [network]
taxonomy:
  category: network
  subcategory: network-performance
  order: 3
  difficulty: intermediate
keywords:
  - Linux kernel
  - Network tuning
  - Jitter
  - ECMP
  - dst_entry
  - Refactoring
relationships:
  related:
    - _network/2025-12-08-비전공자도-쉽게-따라하는-리눅스-커널-해킹-지터를-잡아보자.md
    - _network/2025-12-23-BBRv1을-튜닝해서-지터를-더-줄여보자.md
    - _network/2026-01-15-Network-Basics-How-to-tune-BBRv3.md
    - _network/2026-02-25-고부하-환경에서의-네트워크-분산-최석정의-구수략-증명-기반-직교라틴방진-적용.md
  references: []
  prerequisite: []
  extends: []
  comparison: []
---

---

# Blog Original diff → Current Codebase Refactoring Summary

> Original post: [Linux Kernel Hacking for Non-Majors — Let's Tame Jitter](https://gg582.github.io/network/2025-12-08-%EB%B9%84%EC%A0%84%EA%B3%B5%EC%9E%90%EB%8F%84-%EC%89%BD%EA%B2%8C-%EB%94%B0%EB%9D%BC%ED%95%98%EB%8A%94-%EB%A6%AC%EB%88%85%EC%8A%A4-%EC%BB%A4%EB%84%90-%ED%95%B4%ED%82%B9-%EC%A7%80%ED%84%B0%EB%A5%BC-%EC%9E%A1%EC%95%84%EB%B3%B4%EC%9E%90)
>
> This article summarizes how the patch from that post was refactored into a cleaner architecture: **separate struct extraction, abstract accessor helper, and improved selection logic**.

---

## 1. Core Structural Change: Direct dst_entry Extension → struct dst_power Separation

### Before
Fields were tacked directly onto the **end** of `struct dst_entry`.

```c
/* include/net/dst.h */
struct dst_entry {
    ...
    struct lwtunnel_state *lwtstate;
#endif
    /* USER ADDED */
    u64 ema_load;
    u64 ema_time_delta;
    u64 last_update_jiffies;
    unsigned int ema_k_factor;
    unsigned int power_cost_weight;
};
```

**Problems**
- `sizeof(struct dst_entry)` grows, risking cache-line / page-boundary crossing.
- Every path structure that embeds `dst_entry` (`rtable`, `rt6_info`, `xfrm_dst`, etc.) implicitly shares the same offset, creating ABI fragility.

### After
`struct dst_power` is extracted into a **standalone structure** and **embedded only** where needed (IPv4/IPv6 route structures).

```c
/* include/net/dst.h */
struct dst_power {
    u64 ema_load;
    u64 ema_time_delta;
    u64 last_update_jiffies;
    unsigned int ema_k_factor;
    unsigned int power_cost_weight;
};

struct dst_power *dst_power_ptr(struct dst_entry *dst);
```

```c
/* include/net/route.h */
struct rtable {
    struct dst_entry    dst;
    ...
    struct dst_power    power;   /* ← embedded only for IPv4 routes */
};

/* include/net/ip6_fib.h */
struct rt6_info {
    struct dst_entry    dst;
    ...
    struct dst_power    power;   /* ← embedded only for IPv6 routes */
};
```

**Benefits**
- `dst_entry` size/layout stays intact → cache-line and ABI safety.
- `dst`-derived structures that do not need power metrics remain unaffected.
- Additional protocols (SCTP, XFRM, etc.) can opt-in by embedding `struct dst_power`.

---

## 2. Access Abstraction: Introducing `dst_power_ptr()`

### Before
Every call site dereferenced `struct dst_entry` directly: `dst->ema_load`.

### After
A family-type dispatch helper is centralized in `net/core/dst.c`.

```c
/* net/core/dst.c */
struct dst_power *dst_power_ptr(struct dst_entry *dst)
{
    if (!dst || !dst->ops)
        return NULL;

#if IS_ENABLED(CONFIG_IPV6)
    if (dst->ops->family == AF_INET6) {
        struct rt6_info *rt = (struct rt6_info *)dst;
        return &rt->power;
    }
#endif
    if (dst->ops->family == AF_INET) {
        struct rtable *rt = (struct rtable *)dst;
        return &rt->power;
    }
    return NULL;
}
EXPORT_SYMBOL(dst_power_ptr);
```

**Unified call sites**
- `net/core/dev.c` — `update_dst_ems_metrics()`
- `net/ipv4/fib_semantics.c` — `calculate_lowpower_weight()`
- `net/ipv6/route.c` — `calculate_lowpower_weight()`, `rt6_score_route()`
- `net/ipv4/route.c` — `rt_dst_alloc()` initialization
- `net/ipv6/route.c` — `ip6_dst_alloc()` initialization
- `net/xfrm/xfrm_policy.c` — `xfrm_bundle_create()` initialization
- `net/sctp/outqueue.c` — `calculate_lowpower_weight()`

All locations now follow the uniform pattern: `dst_power_ptr(dst)` → NULL check → field access.

---

## 3. EMA Update Logic

The delta is small. Apart from obtaining the pointer via `dst_power_ptr()`, `update_dst_ems_metrics()` in `net/core/dev.c` (called on successful `dev_hard_start_xmit()`) is nearly identical to the original blog version.

```c
static void update_dst_ems_metrics(struct dst_entry *dst, unsigned int tx_bytes)
{
    u64 cur_jiffies = get_jiffies_64();
    struct dst_power *p = dst_power_ptr(dst);
    u64 cur_load_rate;
    u64 delta_t;

    if (!p)
        return;

    delta_t = cur_jiffies - READ_ONCE(p->last_update_jiffies);
    if (!delta_t)
        return;

    cur_load_rate = tx_bytes / delta_t;

    WRITE_ONCE(p->ema_load,
               EMA_UPDATE(READ_ONCE(p->ema_k_factor),
                          READ_ONCE(p->ema_load), cur_load_rate));

    u64 diff = (cur_load_rate > READ_ONCE(p->ema_load))
        ? cur_load_rate - READ_ONCE(p->ema_load)
        : READ_ONCE(p->ema_load) - cur_load_rate;

    WRITE_ONCE(p->ema_time_delta,
               EMA_UPDATE(READ_ONCE(p->ema_k_factor),
                          READ_ONCE(p->ema_time_delta), diff));
    WRITE_ONCE(p->last_update_jiffies, cur_jiffies);
}
```

---

## 4. Multipath Selection Improvements (`fib_select_multipath`)

### Before
**Two-phase loop** structure:
1. **1st loop**: Iterate all nexthops, evaluate `calculate_lowpower_weight()`, pick the single nexthop with `max_ema_weight`.
2. **2nd loop**: If all weights are zero, fall back to legacy `fib_nh_upper_bound` + `hash`-based ECMP.

Problem: Loops are duplicated, and lowpower policy operates **independently** from existing hash/saddr/upper_bound policy.

### After
**Single-loop** integration. Introduces `nh_score` priority + tie-breaker concept.

```c
void fib_select_multipath(struct fib_result *res, int hash,
                          const struct flowi4 *fl4)
{
    ...
    int score = -1;
    int lowpower_nh_index = -1;
    long max_ema_weight = -1;

    change_nexthops(fi) {
        int nh_score = 0;
        ...

        /* 1) Score existing policies */
        if (saddr && nexthop_nh->nh_saddr == saddr)
            nh_score += 2;
        if (hash <= nh_upper_bound)
            nh_score++;

        /* 2) lowpower weight acts as a tie-breaker */
        dst = get_dst_entry_from_nhc(&nexthop_nh->nh_common);
        current_weight = calculate_lowpower_weight(dst);

        if (nh_score > score ||
            (nh_score == score && current_weight > max_ema_weight)) {
            score = nh_score;
            max_ema_weight = current_weight;
            lowpower_nh_index = nhsel;

            /* 3) Early return on perfect match */
            if (nh_score == 3 || (!saddr && nh_score == 1)) {
                res->nh_sel = nhsel;
                res->nhc = &nexthop_nh->nh_common;
                return;
            }
        }
    } endfor_nexthops(fi);

    if (lowpower_nh_index != -1) {
        res->nh_sel = lowpower_nh_index;
        res->nhc = fib_info_nhc(fi, lowpower_nh_index);
        return;
    }
    ...
}
```

**Summary of improvements**

| Item | AS-IS | TO-BE |
|------|-------|-------|
| Loop count | 2 | 1 |
| Policy relationship | Independent (weight first → fallback) | Integrated (score first → weight tie-breaks) |
| Perfect match | None | **Early return** on `nh_score == 3` or `(!saddr && 1)` |
| saddr priority | Simple boolean | **+2 points** for strong priority |
| Hash bound | Simple boolean | **+1 point** |
| dead/linkdown | Duplicated check in 2nd loop | **Filtered once** in 1st loop |

In short, the **legacy ECMP policies (saddr affinity, hash bound) and lowpower metrics now coexist hierarchically** without collision.

---

## 5. Unified Initialization Pattern

Previously, `rtable`, `rt6_info`, and `xfrm_dst` creators each poked fields directly. Now they all follow the same `dst_power_ptr()` template:

```c
/* IPv4 example (net/ipv4/route.c) */
struct dst_power *p = dst_power_ptr(&rt->dst);
if (p) {
    WRITE_ONCE(p->ema_k_factor, ...);
    WRITE_ONCE(p->power_cost_weight, ...);
    WRITE_ONCE(p->ema_load, 0);
    WRITE_ONCE(p->ema_time_delta, 0);
    p->last_update_jiffies = 0;
}
```

The same template is reused in `xfrm_policy.c` and `net/ipv6/route.c`.

---

## 6. Removed vs. Preserved Parts

### Removed changes
- **`netif_addr_lock_bh()` simplification**: The blog originally replaced `local_bh_disable()` + `spin_lock_nested()` with `spin_lock_bh()`. This change is **not reflected** in the current codebase (likely split into a separate cleanup commit or excluded from the experimental branch).

### Preserved as-is
- `EMA_UPDATE(K, Old, New)` macro (top of `net/core/dev.c`)
- `sysctl` interfaces (`lowpower_ema_k_factor`, `lowpower_power_cost_weight`)
- Defaults (`512`, `100`)
- `IPv6 rt6_score_route()` adding weight via `m += weight`
- Lowpower field initialization and weight function definitions in `SCTP`/`XFRM`

---

## 7. Overall Flow Diagram

```
Packet transmit (dev_hard_start_xmit)
    └── update_dst_ems_metrics(dst, skb->len)
            └── dst_power_ptr(dst) → struct dst_power *
            └── EMA_UPDATE(ema_load, ema_time_delta)

Multipath selection (fib_select_multipath / rt6_score_route)
    └── get_dst_entry_from_nhc / get_dst_entry_from_fib6_nh
    └── calculate_lowpower_weight(dst)
            └── dst_power_ptr(dst)
            └── (ema_load + ema_time_delta) * power_cost_weight
    └── Hierarchical combination with legacy policy (saddr, hash bound)
```

---

## 8. Conclusion

If the original patch was simply "glue fields onto the end of `dst_entry` and use them," the current codebase achieves the following engineering-quality improvements:

1. **Encapsulation**: `struct dst_power` separation + `dst_power_ptr()` abstraction
2. **ABI / cache safety**: `dst_entry` size unchanged; embedded only where needed
3. **Policy integration**: `fib_select_multipath` improved to a single-loop, score-based design so legacy ECMP and lowpower metrics combine naturally
4. **Templatization**: Initialization / access code is unified around `dst_power_ptr()`, improving maintainability
