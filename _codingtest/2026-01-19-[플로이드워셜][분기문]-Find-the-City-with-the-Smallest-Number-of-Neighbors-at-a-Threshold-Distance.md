---
layout: knowledge-base
title: "[플로이드워셜][분기문]-Find the City with the Smallest Number of Neighbors at a Threshold Distance"
subtitle: "플로이드 워셜의 기초를 익히고 제약 조건에서 분기문을 도출하자"
date: 2026-01-19 12:53 +0900
categories: [codingtest]
taxonomy:
  category: codingtest
  subcategory: algorithm-floyd-warshall
  order: 1
difficulty: intermediate
keywords:
  - 플로이드 워셜
  - 알고리즘
  - LeetCode
  - 분기문
relationships:
  related: []
  references: []
  prerequisite: []
  extends: []

# [플로이드워셜][분기문]-Find the City with the Smallest Number of Neighbors at a Threshold Distance
## Problem Statement

There are `n` cities numbered from `0` to `n-1`. Given the array `edges` where `edges[i] = [fromi, toi, weighti]` represents a bidirectional and weighted edge between cities `fromi` and `toi`, and given the integer `distanceThreshold`.

Return the city with the **smallest number of cities** that are reachable through some path and whose distance is **at most** `distanceThreshold`. If there are multiple such cities, return the city with the **greatest number**.

Notice that the distance of a path connecting cities `i` and `j` is equal to the sum of the edges' weights along that path.

---

## Examples

### Example 1

**Input:** `n = 4`, `edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]]`, `distanceThreshold = 4`
**Output:** `3`

<div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #ddd; margin: 20px 0;">
<svg width="260" height="180" viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
  <line x1="50" y1="130" x2="130" y2="50" stroke="#999" stroke-width="2"/>
  <line x1="130" y1="50" x2="210" y2="130" stroke="#999" stroke-width="2"/>
  <line x1="130" y1="50" x2="130" y2="130" stroke="#999" stroke-width="2"/>
  <line x1="130" y1="130" x2="210" y2="130" stroke="#999" stroke-width="2"/>
  <text x="80" y="85" fill="#e74c3c" font-weight="bold" font-size="14">3</text>
  <text x="115" y="100" fill="#e74c3c" font-weight="bold" font-size="14">1</text>
  <text x="180" y="85" fill="#e74c3c" font-weight="bold" font-size="14">4</text>
  <text x="165" y="150" fill="#e74c3c" font-weight="bold" font-size="14">1</text>
  <circle cx="50" cy="130" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="46" y="135" font-family="Arial" font-size="14">0</text>
  <circle cx="130" cy="50" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="126" y="55" font-family="Arial" font-size="14">1</text>
  <circle cx="130" cy="130" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="126" y="135" font-family="Arial" font-size="14">2</text>
  <circle cx="210" cy="130" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="206" y="135" font-family="Arial" font-size="14">3</text>
</svg>
</div>

**Explanation:** The neighboring cities at a `distanceThreshold = 4` for each city are:
- City 0 -> [City 1, City 2]
- City 1 -> [City 0, City 2, City 3]
- City 2 -> [City 0, City 1, City 3]
- City 3 -> [City 1, City 2]
Cities 0 and 3 have 2 neighboring cities at a `distanceThreshold = 4`, but we have to return city 3 since it has the greatest number.

### Example 2

**Input:** `n = 5`, `edges = [[0,1,2],[0,4,8],[1,2,3],[1,4,2],[2,3,1],[3,4,1]]`, `distanceThreshold = 2`
**Output:** `0`

<div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #ddd; margin: 20px 0;">
<svg width="260" height="180" viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
  <line x1="40" y1="40" x2="110" y2="40" stroke="#999" stroke-width="2"/>
  <line x1="40" y1="40" x2="40" y2="140" stroke="#999" stroke-width="2"/>
  <line x1="110" y1="40" x2="180" y2="40" stroke="#999" stroke-width="2"/>
  <line x1="110" y1="40" x2="40" y2="140" stroke="#999" stroke-width="2"/>
  <line x1="180" y1="40" x2="180" y2="140" stroke="#999" stroke-width="2"/>
  <line x1="180" y1="140" x2="40" y2="140" stroke="#999" stroke-width="2"/>
  <text x="70" y="35" fill="#e74c3c" font-weight="bold" font-size="14">2</text>
  <text x="20" y="100" fill="#e74c3c" font-weight="bold" font-size="14">8</text>
  <text x="140" y="35" fill="#e74c3c" font-weight="bold" font-size="14">3</text>
  <text x="80" y="100" fill="#e74c3c" font-weight="bold" font-size="14">2</text>
  <text x="185" y="100" fill="#e74c3c" font-weight="bold" font-size="14">1</text>
  <text x="110" y="155" fill="#e74c3c" font-weight="bold" font-size="14">1</text>
  <circle cx="40" cy="40" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="36" y="45" font-family="Arial" font-size="14">0</text>
  <circle cx="110" cy="40" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="106" y="45" font-family="Arial" font-size="14">1</text>
  <circle cx="180" cy="40" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="176" y="45" font-family="Arial" font-size="14">2</text>
  <circle cx="180" cy="140" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="176" y="145" font-family="Arial" font-size="14">3</text>
  <circle cx="40" cy="140" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="36" y="145" font-family="Arial" font-size="14">4</text>
</svg>
</div>

**Explanation:** The neighboring cities at a `distanceThreshold = 2` for each city are:
- City 0 -> [City 1]
- City 1 -> [City 0, City 4]
- City 2 -> [City 3, City 4]
- City 3 -> [City 2, City 4]
- City 4 -> [City 1, City 2, City 3]
The city 0 has 1 neighboring city at a `distanceThreshold = 2`.

---

## Constraints

- `2 <= n <= 100`
- `1 <= edges.length <= n * (n - 1) / 2`
- `edges[i].length == 3`
- `0 <= fromi < toi < n`
- `1 <= weighti, distanceThreshold <= 10^4`
- All pairs `(fromi, toi)` are distinct.


## 문제 해석
일단 이 문제는 분기문이 나오기 전까지는 완전히 플로이드워셜 문제이다.
일단 플로이드 워셜부터 한번 짚고 넘어가보자. 알고리즘은 쉽지만 외우려면 잘 안 외워진다.
### 플로이드워셜
우선 이 순회를 돌리기 전에, 초기 거리값은 자기 자신인 `i == j`만 0으로 열외시키고 충분히 큰 값을 넣어 준다.
`dist[i][k]+dist[k][j]`로 계산하니 만약 사용 자료형이 표준 자료형이라면 C로 따지면 `limits.h`같은 곳에서 최대값을 불러오고 2로 나눈 값으로 초기화해도 상관없다.
```c
    for(k = 0; k < nodes; k++) {
        for(i = 0; k < nodes; i++) {
            for(j = 0; j < nodes; j++) {
                dist[i][j] = (dist[i][k]+dist[k][j]) < dist[i][j] ?
                              dist[i][k]+dist[k][j]  ? dist[i][j] ;
            }
        }
    }
```

이러한 알고리즘이다. `k우선, 안에 i, j`까지는 외우기 쉬우나 안의 삼항 내지는 `if`조건문으로 구현하는 부분이 굉장히 인덱스가 어렵다.
이것을 쉽게 외우려면 옆나라 말을 빌려오자...
상기된 어조도 "이쿠죠오" 라고 말할 때의 강세를 따라 로마자로 만들면 "ikkujoooo"이다.
자음만 떼보자. **ikkj**이다. 좀 유치하긴 해도 이렇게 외우면 황당해서라도 머리에 남는다.

k, i, j가 모두 노드 개수만큼 순회하고 이것은 모든 방향에 대한 최단거리를 구한다.
복잡한 다익스트라보다 이게 더 외우기 쉽다. 코딩 테스트는 일단 푸는 게 중요하니 우열을 따지지 말고 플로이드워셜로 풀이를 써나간다.

### 분기문

문제가 겉보기에는 플로이드워셜 알고리즘만 충실하게 익히면 되는 문제지만 아주 무서운 조건이 숨어 있다.
```
Return the city with the **smallest number of cities** that are reachable through some path and whose distance is **at most** `distanceThreshold`. If there are multiple such cities, return the city with the **greatest number**.
```

이 분기문이 뜻하는 바는 `distanceThresheld 이하의 거리로 가장 적은 도시에 닿을 수 있는 도시를 구하시오. 만약 조건을 충족하는 경우가 다수라면 가장 번호가 큰 도시를 구하시오.`이다.

도시를 탐색할 때는 어차피 for문으로 순회한다. 가장 큰 도시를 구하기 위해 맵을 그려보고 `max`함수를 구현하거나 불러올 생각을 하면 이 문제를 풀 수 없다.

그렇다면 i를 순회하면서 j를 도는 과정에서 `distanceThreshold 이하의 거리 수`를 세아리고 순회 과정에서 그것과 작거나 같은 거리 수를 찾으면 덮어쓰면 된다.
이 부분은 코드로 설명하는 것이 빠르다.

```c
int answer = 0  ;
int min_cnt= n+1;

for(int i = 0; i < n; i++) {
    int cnt = 0;
    for(int j = 0; j < n; j++) {
        if((j != i)
        && (graph[i][j] <= distanceThreshold)
        ) {
            cnt++;
        }
    }
    if(cnt<=min_cnt) {
        min_cnt = cnt;
        answer = i;
    }
}
```


이런 흐름으로 작성해 주면 된다.


## 풀이

풀이는 정석적으로 플로이드워셜 후 분기문으로 업데이트, 반환 순으로 가겠다. 다익스트라에 익숙하다면 그것을 써도 상관없다.


```c
#include <string.h>
#include <limits.h>

int findTheCity(int n, int** edges, int edgesSize, int* edgesColSize, int distanceThreshold) {
    int graph[101][101];

    for(int i = 0; i < 101; i++) {
        for(int j = 0; j < 101; j++) {
            graph[i][j] = i == j     ?
                          0          :
                          INT_MAX / 2;
        }
    }

    for(int i = 0; i < edgesSize; i++) {
        graph[edges[i][0]][edges[i][1]] = edges[i][2];
        graph[edges[i][1]][edges[i][0]] = edges[i][2];
    }

    for(int k = 0; k < n; k++) {
        for(int i = 0; i < n; i++) {
            for(int j = 0; j < n; j++) {
                graph[i][j] = (graph[i][k] + graph[k][j]) < graph[i][j] ?
                              graph[i][k] + graph[k][j] : graph[i][j] ;
            }
        }
    }

    int answer = 0  ;
    int min_cnt= n+1;

    for(int i = 0; i < n; i++) {
        int cnt = 0;
        for(int j = 0; j < n; j++) {
            if((j != i)
            && (graph[i][j] <= distanceThreshold)
            ) {
                cnt++;
            }
        }
        if(cnt<=min_cnt) {
            min_cnt = cnt;
            answer = i;
        }
    }

    return answer;
}
```


## 소감

카카오엔터프라이즈와 같은 회사들에서 영자 문제를 낸다고 들었다. 혹시 모를 상황에 대비해 리트코드를 풀고 있다.
문제의 질이 백준보다 상식적이고 잡일이 적다는 느낌을 받게 한다. 그러나 국내 기업에선 많은 분기문, 복잡한 제약조건, 브루트 포스형 체력검정을 아주 선호하기 때문에 이런 깔끔하고 아름다운 문제가 나온다는 것은 상상할 수 없다. 기본기를 리트코드로 익히고 백준에 업로드된 문제들을 영어로 번역하고, 그것을 백준에 제출하는 식으로 최종 준비를 해야겠다.
개인적인 소감으로는 국내 기업 시험들도 리트코드처럼 깔끔한 문제를 내 줄 수는 없는지? 라는 생각이 들었다.
