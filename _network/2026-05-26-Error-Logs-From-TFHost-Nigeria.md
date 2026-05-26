---
layout: knowledge-base
title: Error Logs From TFHost Nigeria
subtitle: DNS delegation failure and VPS reachability incident notes
date: 2026-05-26 19:38:42 +0900
categories:
- network
taxonomy:
  category: network
  subcategory: network-protocol
  order: 4
difficulty: intermediate
keywords:
- DNS
- SERVFAIL
- EDE 22
- Authoritative DNS
- VPS
- Network Incident
- Transit Routing
- TFHost Nigeria
- Njalla
relationships:
  related:
  - _network/2026-01-15-Network-Basics-How-to-tune-BBRv3.md
  - _network/2025-12-23-BBRv1을-튜닝해서-지터를-더-줄여보자.md
  references: []
  prerequisite: []
  extends: []
  comparison: []
---

# TFHost Incident Recovery Analysis
Date: 2026-05-26
Timezone: KST (UTC+9)
Observer Location: South Korea (KT ISP)
Resolver Used: Cloudflare DNS (`1.1.1.1`)

---

# Executive Summary

A provider-level outage affected TFHost’s DNS authority (`tfhost.ng`) and customer VPS network reachability.

Real-time telemetry logs show:

- DNS authority failure (`SERVFAIL`)
- Temporary resolver communication timeouts
- SSH port (`22/tcp`) persistently unreachable
- Sudden simultaneous DNS and SSH recovery
- Stable recovery confirmed afterward

This evidence suggests that the outage was not caused by a single VPS daemon failure, but by a broader provider-side infrastructure incident involving the TFHost control plane and associated network path.

---

# Observed Systems

## TFHost Control Plane

Host:

```text
tfhost.ng
```

Observed normal A record after recovery:

```text
160.119.196.25
```

---

## Customer VPS

Host:

```text
oborona.zip
```

Resolved A record:

```text
160.119.197.71
```

Observed service:

```text
SSH (22/tcp)
```

---

# Recovery Monitoring Method

Automated monitoring script executed every 30 seconds:

Checks:

1. DNS resolution of `tfhost.ng` through Cloudflare (`1.1.1.1`)
2. TCP connection to VPS (`160.119.197.71:22`)

State logging:

- DNS state
- SSH state
- Event changes
- Full recovery detection

---

# Real-Time Recovery Timeline

## Initial Failure

At monitoring start:

```text
2026-05-26 19:38:42 KST
DNS=SERVFAIL
SSH=DOWN
```

Meaning:

- Public resolver (`1.1.1.1`) reachable
- TFHost authoritative DNS not functioning
- VPS SSH unavailable

---

## DNS Communication Flapping

Observed intermittently:

```text
DNS=;; communications error to 1.1.1.1#53: timed out
;; no servers could be reached
```

Important correction:

This **does not mean TFHost returned that response**.

It means:

- The monitoring probe itself temporarily failed to receive a DNS response from Cloudflare (`1.1.1.1`)
- Possible transient path instability, packet loss, or timeout during incident conditions

This is distinct from:

```text
DNS=SERVFAIL
```

Which means:

- Cloudflare resolver answered
- TFHost authoritative delegation still failed

Therefore:

Two different DNS failure states were observed:

| State | Meaning |
|---|---|
| `SERVFAIL` | Resolver alive, TFHost authority unreachable |
| `communications error ... timed out` | Resolver query path itself unstable |

---

## Persistent SSH Failure

Throughout the flap:

```text
SSH=DOWN
```

Observed continuously from:

```text
19:38:42
→
19:45:14
```

Meaning:

- VPS host (`160.119.197.71`) remained unreachable
- Control plane instability had not yet translated into compute recovery

---

## Simultaneous Recovery Event

At:

```text
2026-05-26 19:45:49 KST
```

Monitoring log:

```text
DNS=160.119.196.25 SSH=OPEN
EVENT DNS_CHANGED old=SERVFAIL new=160.119.196.25
EVENT SSH_CHANGED old=DOWN new=OPEN
EVENT FULL_RECOVERY
```

Meaning:

- TFHost control plane DNS returned a valid A record
- VPS SSH (`160.119.197.71:22`) became reachable
- Both control plane and customer network path recovered simultaneously

---

## Recovery Persistence

Subsequent checks:

```text
2026-05-26 19:46:21 KST
DNS=160.119.196.25 SSH=OPEN
EVENT FULL_RECOVERY
```

```text
2026-05-26 19:46:52 KST
DNS=160.119.196.25 SSH=OPEN
EVENT FULL_RECOVERY
```

Manual validation:

```text
$ dig @1.1.1.1 tfhost.ng
```

Returned:

```text
status: NOERROR
tfhost.ng. IN A 160.119.196.25
Query time: 4 msec
```

At:

```text
2026-05-26 19:47:10 KST
```

---

# Technical Interpretation

## Actual Logical Relationship

### DNS Resolution Path

```text
Local PC
→ KT ISP
→ Cloudflare (1.1.1.1)
→ TFHost authoritative nameservers
→ tfhost.ng resolves to 160.119.196.25
```

---

### VPS Service Path

```text
Local PC
→ KT ISP
→ global transit network
→ TFHost routed prefix
→ VPS 160.119.197.71
→ SSH 22/tcp
```

---

## Why Simultaneous Recovery Matters

The recovery event showed:

```text
DNS restored
AND
SSH restored
at the same timestamp
```

This strongly suggests:

- Provider-side control plane stabilization
- Network/routing plane stabilization
- Not merely a DNS daemon restart

Because if only DNS recovered:

```text
DNS OK
SSH DOWN
```

would have occurred.

That was not observed.

---

# Recovery Window

Monitoring start:

```text
19:38:42 KST
```

Full recovery detected:

```text
19:45:49 KST
```

Total monitored outage window:

```text
7 minutes 7 seconds
```

---

# Incident Pattern Summary

Observed progression:

1. DNS authority failure (`SERVFAIL`)
2. DNS query-path timeouts
3. Persistent VPS SSH failure
4. Continued DNS flap
5. Sudden simultaneous DNS + SSH recovery
6. Stable recovery validation

---

# Final Assessment

This incident is consistent with:

```text
Provider-level infrastructure flap
```

Most likely involving one or more of:

- Authoritative DNS instability
- Control plane outage
- Routing/prefix instability
- Network recovery synchronization

---

# Key Evidence

## Outage Start

```text
2026-05-26 19:38:42 KST
DNS=SERVFAIL
SSH=DOWN
```

---

## Recovery Event

```text
2026-05-26 19:45:49 KST
DNS=160.119.196.25
SSH=OPEN
EVENT FULL_RECOVERY
```

---

## Manual Validation

```text
2026-05-26 19:47:10 KST
status: NOERROR
tfhost.ng IN A 160.119.196.25
Query time: 4 msec
```

---

# Conclusion

TFHost experienced a provider-side outage affecting both:

- DNS authority
- Customer VPS network reachability

Recovery was observed as a simultaneous restoration of:

- Public DNS resolution
- VPS SSH connectivity

This strongly indicates infrastructure-level recovery rather than isolated application recovery.
