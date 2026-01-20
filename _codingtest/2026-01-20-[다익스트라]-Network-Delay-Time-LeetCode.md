---
layout: knowledge-base
title: "[다익스트라]Network Delay Time-LeetCode"
subtitle: "다익스트라 알고리즘을 이용하는 그래프 탐색의 기초"
date: 2026-01-19 12:53 +0900
categories: [codingtest]
taxonomy:
  category: codingtest
  subcategory: algorithm-dijkstra
  order: 1
difficulty: intermediate
keywords:
  - 문자열
  - 다익스트라
  - 그래프
relationships:
  related: []
  references: []
  prerequisite: []
  extends: []
  comparison: []

---

# 문제
## 743. Network Delay Time

**Medium**

You are given a network of `n` nodes, labeled from `1` to `n`. You are also given `times`, a list of travel times as directed edges `times[i] = (ui, vi, wi)`, where `ui` is the source node, `vi` is the target node, and `wi` is the time it takes for a signal to travel from source to target.

We will send a signal from a given node `k`. Return the minimum time it takes for all the `n` nodes to receive the signal. If it is impossible for all the `n` nodes to receive the signal, return `-1`.

---

### Example 1:

<div style="text-align: center; margin: 20px 0;">
<svg width="300" height="150" viewBox="0 0 300 150" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
<circle cx="150" cy="30" r="20" fill="#fff" stroke="#333" stroke-width="2" />
<text x="150" y="35" text-anchor="middle" font-family="Arial" font-weight="bold">2</text>

<circle cx="50" cy="120" r="20" fill="#fff" stroke="#333" stroke-width="2" />
<text x="50" y="125" text-anchor="middle" font-family="Arial" font-weight="bold">1</text>

<circle cx="250" cy="120" r="20" fill="#fff" stroke="#333" stroke-width="2" />
<text x="250" y="125" text-anchor="middle" font-family="Arial" font-weight="bold">3</text>

<circle cx="250" cy="40" r="10" fill="none" opacity="0" /> <circle cx="350" cy="120" r="20" fill="#fff" stroke="#333" stroke-width="2" transform="translate(-100, 0)" />
<text x="250" y="125" text-anchor="middle" font-family="Arial" font-weight="bold" transform="translate(0, 0)">3</text>

<circle cx="250" cy="120" r="20" fill="#fff" stroke="#333" stroke-width="2" />
<text x="250" y="125" text-anchor="middle" font-family="Arial" font-weight="bold">3</text>

<circle cx="350" cy="120" r="20" fill="#fff" stroke="#333" stroke-width="2" />
<text x="350" y="125" text-anchor="middle" font-family="Arial" font-weight="bold">4</text>

<rect width="400" height="150" fill="white"/>
<circle cx="100" cy="40" r="18" fill="white" stroke="black" stroke-width="2"/>
<text x="100" y="45" text-anchor="middle" font-size="14">2</text>
<circle cx="40" cy="110" r="18" fill="white" stroke="black" stroke-width="2"/>
<text x="40" y="115" text-anchor="middle" font-size="14">1</text>
<circle cx="160" cy="110" r="18" fill="white" stroke="black" stroke-width="2"/>
<text x="160" y="115" text-anchor="middle" font-size="14">3</text>
<circle cx="250" cy="110" r="18" fill="white" stroke="black" stroke-width="2"/>
<text x="250" y="115" text-anchor="middle" font-size="14">4</text>

<path d="M 85,53 L 55,95" stroke="black" stroke-width="1.5" marker-end="url(#arrow)"/>
<text x="60" y="70" font-size="12" fill="red">1</text>
<path d="M 115,53 L 145,95" stroke="black" stroke-width="1.5" marker-end="url(#arrow)"/>
<text x="140" y="70" font-size="12" fill="red">1</text>
<path d="M 178,110 L 232,110" stroke="black" stroke-width="1.5" marker-end="url(#arrow)"/>
<text x="205" y="105" font-size="12" fill="red">1</text>

<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="black" />
</marker>
</defs>
</svg>
</div>

**Input:** `times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2`

**Output:** `2`

---

### Example 2:

**Input:** `times = [[1,2,1]], n = 2, k = 1`

**Output:** `1`

---

### Example 3:

**Input:** `times = [[1,2,1]], n = 2, k = 2`

**Output:** `-1`

---

### Constraints:

* `1 <= k <= n <= 100`
* `1 <= times.length <= 6000`
* `times[i].length == 3`
* `1 <= ui, vi <= n`
* `ui != vi`
* `0 <= wi <= 100`
* All the pairs `(ui, vi)` are unique. (i.e., no multiple edges.)


## 첫인상

일단 첫인상을 말하겠다. **원래 책이나 문서 보고 읽으면서 구현하는 경우가 많은 것들을 실무랑 다르게 백지시험으로 즉석 구현하라는 과제를 내다니, 과거 시험이냐?**

각설하고, 이 더럽고 짜증나는 다익스트라 구현을 외우는 방법을 고심해 보자.

- 우선 순위 큐 구현하는 시간 아껴야 한다. C언어로 하기 힘들다.
- 문제를 이해하고 그 자리에서 처음부터 발명할 생각은 하지 말자. DP나 그리디면 되겠지만 이런 유형에서 절대 안 된다.
- 짜증나도 고등학교 공부하듯 달달달 외워야 한다. 핵심 규칙을 짚고 그걸 기점으로 미친듯이 외워야 한다.


허어..참내, 일단 외울 궁리부터 해 보자.

1. 거리를 담을 배열을 정의한다.
  1.1. 이 녀석이 가중치(거리) 이러쿵저러쿵한 결과를 담을 거다.
  1.2. 거리값은 충분히 큰 값으로 채운다.
2. 노드 n에서 m으로 가는 길들을 담는 동적 배열을 만든다. 여기서 대충 `adj`라고 하자.
2. 가중치 우선 정렬되어야 하니 정수쌍의 첫째를 가중치, 둘째를 노드 번호로 담자.
3. A에서 어떠한 노드까지의 이러한 정수쌍을 다 계산해서 동적배열(C++ Vector같은 것)에 때려넣자.
4. **우선순위 큐를 정의한다.**
5. 최종 목적지 K까지의 가중치를 0으로 초기화한다.(예: dist[k] = 0)
6. 우선순위 큐에 `{dist[k], k}` 쌍을 때려넣는다.
  6.1. 이 형태를 기억해야 한다.
7. 우선 순위 큐가 빌 때까지를 조건으로 반복문을 연다. 하위 내용 반복
  7.1. 우선 순위 큐의 Top을 뽑고 가중치와 노드 번호를 추린다. 이걸 `current`라고 한다.
  7.2. 현재 노드의 `adj`를 돈다. for문에서의 이터레이터를 `next`라고 하자.
    7.3. 만약 `next의 가중치 + 현재 current의 거리값(dist) < next`의 거리값이면 그것으로 `next의 거리값(dist)`을 갱신하고 6.1의 형태로 `next`를 때려넣는다.


....어이가 없다. 이걸 암송해야 한다. 책 안 보고 이걸 15-20분만에 완벽 구현 후 문제에 적용하는 데까지 10-15분 써야 한다. 이러니까 내가 IT를 어느 순간부터 진지하게 생각해도 되나 의구심이 든 것이다.

각설하고, 이 흐름을 따라가면서 코드를 봐야 한다. 솔직히 토나오게 길지만...

## 풀이

```cpp
#include <climits>
#include <queue>

typedef pair<int, int> pii; // first: weight, second: dest

class Solution {
public:
    int networkDelayTime(vector<vector<int>>& times, int n, int k) {
        int dist[101];
        for(int i = 0; i <= n; i++) dist[i] = INT_MAX / 2;

        vector<pii> adj[101]; // to be used like adj[u].first = weight; adj[u].second = dest;

        for(auto v: times) {
            pii p;
            p.first  = v[2];
            p.second = v[1];
            adj[v[0]].push_back(p);
        }

        priority_queue<pii, vector<pii>, greater<pii>> pq;

        dist[k] = 0;
        pq.push({dist[k], k});

        while(!pq.empty()) {
            int current_node   = pq.top().second;
            int current_weight = pq.top().first;

            pq.pop();

            if(current_weight > dist[current_node]) continue;

            for(auto next: adj[current_node]) {
                int next_node   = next.second;
                int next_weight = next.first;

                if((dist[current_node] + next_weight) < dist[next_node]) {
                    dist[next_node] = dist[current_node] + next_weight;
                    pq.push(make_pair(dist[next_node], next_node));
                }
            }
        }

        int max_dist = -1;
        for(int i = 1; i <= n; i++) {
            if(dist[i] == (INT_MAX/ 2)) return -1;
            max_dist = ((dist[i] > max_dist)) ?
                         dist[i] : max_dist   ;
        }
        return max_dist;
    }
};
```

어....진짜 뭐라고 할 말이 없다. 놀라운 건 이 정도 문제면 대기업 공채 기출에서 `쉬움`이다.
솔직히 말해서 이런 것들까지 다 잘 풀어도 어차피 실제 프로토콜 구현할 때는 유명한 구현체를 끌어 쓸 텐데, 왜 기합을 굳이 테스트하려는 것인지 모르겠다.

...뭐라고 더 할 말이 없다.
그냥 닥치고 이거라도 외우자.
