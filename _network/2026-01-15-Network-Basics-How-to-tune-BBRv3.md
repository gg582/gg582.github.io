---
layout: post
title: Network Basics - How to Tune BBRv3
date: 2026-01-15 12:30:00 +0900
categories: [network]
---

# Tuning the standard algorithm: Holy Grail shouldn't hold Coca-Cola

Tuning the standard algorithm may sound dangerous and intriguing at the same time.
As many sophisticated researchers have cross-checked the benefits of algorithms, some might think this is too controversial.
But you can compare these two: a latte mug and, yes--the Holy Grail.

First, what is the benefit of a *latte mug*?

This is made under the shade of **modern industry**, which means it can perform well with any kind of soda.
However, it cannot symbolize divinity on its own, nor can it bless someone who owns it.

How about the Holy Grail?

This was made when St. Peter was still alive, which means it can be damaged by Coca-Cola.
However, the Holy Grail can symbolize the sacrifice of Jesus, and it can bless somebody who is sincere.

This is the difference in prestige.

Then, let's think about standard BBRv3 and a tuned one.

The standard one is a latte mug.
It can hold any sort of beverage, but it is hard to use when celebrating Mass.

The tuned one is an imitation of the Holy Grail.
If we define the Holy Grail as "a flawless algorithm for specific problems," then this is an imitation of it.
This means it is good enough to hold wine and bread.

## Let's think about BBRv3: Balance & Options

Simply, BBRv3 aims for **harmony**.
This means it will not aggressively scale its transmission rate only for itself.

<img src="assets/BBRv3_Overview.jpg" style="width: 70%; height: auto;" alt="BBRv3's big picture">

### Balance

As you can see in the picture, the pacing engine controls the transmission pace using calculated metrics from the probing state machine.
This means the pacing engine will behave consistently based on the given metrics.
If you are running a Kubernetes cluster with this congestion control logic, this is ideal.

### Options

However, if you are maintaining real-time game servers that must guarantee HA (High Availability), there are some good points to tune.

BBRv3 is still prone to sudden metric changes, although many experiments prove that it is much improved compared to legacy algorithms (like Cubic or Vegas), especially in worse cases.

I will explain this with a friendly example: cars.

BBRv3 is just like an F1 racing car from Ferrari.
It has a strong accelerator pedal and a brake pedal, but it will not provide intelligent deceleration for you.
So, if you are driving this car on a track, it is the best fit.
But what would happen if you drive this car in rush-hour traffic in Seoul?
You will have trouble controlling it.

Then you will need intelligent features like AI deceleration, which are commonly found in modern sedans.

### Plan

As a result, we can build a plan based on this metaphor.

1. Reduce CWND (Congestion Window) when metrics get too bad.
2. Make a custom metric with previous bandwidth records.
  2-1. Use this metric to reduce pacing.

## How can I implement this?

Since the source of BBRv3 is simple and clear, we can easily plan how to implement it.
When looking at the bit-field, there are unused bits.
If we are planning to reduce CWND, we need a switch bit to trigger it.
So, we can use an additional 1 bit to mark this information.

-------------------------------------------------------------
| <font color="#ff3200">reduce_cwnd<font> | .. | .. | .. | .. |
-------------------------------------------------------------

Also, we must store a pacing-gain ratio to remember *how much we should reduce pacing*.
As a result, we need a new member in `struct bbr`.

```c
struct bbr {
// ... other members
    alpha_last_delivered_ce; // insert below this line!
	u32	pacing_gain_extra;
};
````

Then, we should define the thresholds to trigger `reduce_cwnd` and control pacing, which are applied inside the pacing engine.

```c
	#define BW_DELTA_ALPHA        (BBR_UNIT / 2) // the ratio for limiting reduce logic: 50%. reduce 20% when throughput is 40% dropped
	#define BW_DELTA_CEILING      (BBR_UNIT / 4) // max pacing reduce ratio: 25%
	#define BW_DELTA_FLOOR        (BBR_UNIT * 3 / 4) // when calculated pacing gain is dropped below 75%, turn on reduce_cwnd.
```

Add this to `bbr_init` to initialize the bit and variable.

```c
// ... rest of the codes are omitted...
		bbr->pacing_gain_extra = BBR_UNIT;
		bbr->reduce_cwnd = 0;
// ...
```

### Declaring functions (Concept only)

```c
	static void bbr_tweak_pacing_reduction(struct sock *sk, u32 sample_bw, u32 old_bw)
	{
		struct bbr *bbr = inet_csk_ca(sk);
		u32 max_bw_val = bbr_max_bw(sk);

		if (!max_bw_val || sample_bw >= old_bw) {
			bbr->pacing_gain_extra = BBR_UNIT;
			return;
		}

		u64 delta = ((u64)(old_bw - sample_bw) * BBR_UNIT) / max_bw_val;
		u64 reduction = (delta * BW_DELTA_ALPHA) >> BBR_SCALE;

		if (reduction > BW_DELTA_CEILING)
			reduction = BW_DELTA_CEILING;

		bbr->pacing_gain_extra = BBR_UNIT - (u32)reduction;
		bbr->reduce_cwnd = 0;

		if (bbr->pacing_gain_extra < BW_DELTA_FLOOR) {
			bbr->reduce_cwnd = 1;
			if (bbr->pacing_gain_extra < BBR_UNIT / 8)
				bbr->pacing_gain_extra = BBR_UNIT / 8;
		}
	}
```

First, this calculates whether to slow down or not.

And apply this to `bbr_main`:

```c
// ... rest of the codes are omitted
		if (rs->interval_us > 0 && rs->acked_sacked > 0) {
			if (!rs->is_app_limited || ctx.sample_bw >= bbr_max_bw(sk))
				bbr->bw_hi[1] = max(bbr->bw_hi[1], ctx.sample_bw);

			bbr_tweak_pacing_reduction(sk, ctx.sample_bw, old_bw); // this line has inserted to adjust pacing rate metric

			if (bbr->round_start) {
				bbr->bw_hi[0] = bbr->bw_hi[1];
				bbr->bw_hi[1] = 0;
			}
		}
// ...
```

Add this to `bbr_set_cwnd`:

```c
// ... rest of the codes are omitte
	if (!acked) goto done; // insert below this line
	if (bbr->reduce_cwnd) {
		cwnd = max_t(s32, cwnd - acked, 1);
		bbr->reduce_cwnd = 0;
	}
// ...
```

## Ping Test

Although ping is basically an ICMP test tool, ICMP and TCP share the same buffer.
This can still be a good metric to measure bufferbloat.

<div style="overflow-x:auto;">
  <table style="border-collapse:collapse; width:100%; font-variant-numeric: tabular-nums;">
    <thead>
      <tr>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Path</th>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Metric</th>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Vanilla BBRv3</th>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Modified BBRv3</th>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Δ (Mod-Van)</th>
        <th style="border-bottom:2px solid #ccc; text-align:left; padding:6px 8px;">Improvement (↓ better)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th colspan="6" style="padding:10px 8px; text-align:left; background:rgba(0,0,0,0.04); border-top:1px solid #ddd;">
          LAN (ping 192.168.168.102, n=1000)
        </th>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Avg RTT (ms)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.023</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.017</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.006</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+26.8%</td>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">mdev (ms)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.032</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.009</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.023</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+71.9%</td>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">p99 RTT (ms)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.046</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.043</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.003</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+6.5%</td>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">p99.9 RTT (ms)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.152</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.058</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.094</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+61.8%</td>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Max RTT (ms)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.962</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.059</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.903</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+93.9%</td>
      </tr>
      <tr>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">LAN</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Loss (%)</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0 pp</td>
        <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0 pp</td>
      </tr>

```
  <tr>
    <th colspan="6" style="padding:10px 8px; text-align:left; background:rgba(0,0,0,0.04); border-top:1px solid #ddd;">
      WAN (ping 1.1.1.1, n=1000)
    </th>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Avg RTT (ms)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">5.830</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">5.791</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.039</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+0.7%</td>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">mdev (ms)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.841</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.201</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.640</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+76.1%</td>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">p99 RTT (ms)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">6.310</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">6.220</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-0.090</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+1.4%</td>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">p99.9 RTT (ms)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">12.818</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">6.341</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-6.477</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+50.5%</td>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Max RTT (ms)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">30.600</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">7.220</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">-23.380</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">+76.4%</td>
  </tr>
  <tr>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">WAN</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:left;">Loss (%)</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0 pp</td>
    <td style="border-top:1px solid #eee; padding:6px 8px; text-align:right;">0.0 pp</td>
  </tr>
</tbody>
```

  </table>

  <p style="margin:0.6em 0 0; font-size:0.95em; color:#666;">
    Percentages are computed as (Vanilla - Modified) / Vanilla. Positive means Modified is better (lower latency/jitter).
  </p>
</div>

As a result, RTT has improved significantly--something that would not happen if we only tweaked user-space applications.
Now, let's move on to the iPerf test, since BBRv3 does a lot more than BBRv1/v2, which I posted about before.
In that previous post, I only attached a ping test, but now I am sharing an iPerf3 test for you.

## IPerf3 Test

<style>
  .bbr-comparison-box {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 25px 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .bbr-comparison-box th {
    background-color: #1a202c;
    color: #ffffff;
    padding: 15px;
    text-align: center;
    border: 1px solid #2d3748;
  }
  .bbr-comparison-box td {
    padding: 14px;
    border: 1px solid #e2e8f0;
    text-align: center;
  }
  .bbr-comparison-box .metric-label {
    background-color: #f7fafc;
    font-weight: 600;
    text-align: left;
    color: #2d3748;
  }
  .bbr-comparison-box .highlight-positive {
    color: #38a169;
    font-weight: bold;
  }
  .bbr-comparison-box .vanilla-val { color: #718096; }
</style>

<table class="bbr-comparison-box">
  <thead>
    <tr>
      <th>Metric (Forward)</th>
      <th>Vanilla (BBR3 Baseline)</th>
      <th>Modified (BBR3 Optimized)</th>
      <th>Improvement</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="metric-label">Throughput (Recv)</td>
      <td class="vanilla-val">81.23 Mbps</td>
      <td>84.99 Mbps</td>
      <td class="highlight-positive">+4.63%</td>
    </tr>
    <tr>
      <td class="metric-label">TCP Retransmissions</td>
      <td class="vanilla-val">580</td>
      <td>342</td>
      <td class="highlight-positive">+41.03% (Reduced)</td>
    </tr>
    <tr>
      <td class="metric-label">Avg Latency (Ping)</td>
      <td class="vanilla-val">28.71 ms</td>
      <td>25.96 ms</td>
      <td class="highlight-positive">+9.58% (Reduced)</td>
    </tr>
    <tr>
      <td class="metric-label">Max Latency (Jitter)</td>
      <td class="vanilla-val">73.05 ms</td>
      <td>43.69 ms</td>
      <td class="highlight-positive">+40.19% (Reduced)</td>
    </tr>
  </tbody>
</table>

As you can see, max latency has improved by 40%, while throughput increased by 4%.
Average latency has improved by 9% with this tweak, even though Google is generally known for high-performance tuning.
This shows that every case has its own niche points, even though many methods are developed by renowned corporations.
Since the CWND management logic acted as a brake pedal, it does not affect the balanced options of BBRv3 much; if you are planning to tune your kernel, I recommend you stay within your own safe zone.

## What can be the direction of my tuning?

My safe zone was *not to accept packets aggressively*.
Personally, I concluded that preventing bufferbloat is more important than aggressively allowing packets to increase throughput (like an old Korean proverb: You may burn your house down when you try to burn bedbugs).

Consequently, in my case, I *reduced* the speed of certain parts that are usually considered conservative tuning.
But some aggressive tuning decreases pacing to obtain better responsiveness, which I wouldn't do for my server.

If you are a skilled engineer, you may add those sorts of tunings to squeeze a dry towel.
