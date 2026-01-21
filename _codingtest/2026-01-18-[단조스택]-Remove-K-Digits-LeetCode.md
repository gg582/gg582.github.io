---
layout: knowledge-base
title: "[단조스택] Remove K Digits-LeetCode"
subtitle: "단조 스택을 활용한 숫자 최소화 문제"
date: 2026-01-18 15:56 +0900
categories: [codingtest]
taxonomy:
  category: codingtest
  subcategory: algorithm-data-structure
  order: 2
difficulty: intermediate
keywords:
  - 단조스택
  - 스택
  - LeetCode
  - 알고리즘
  - 그리디
relationships:
  related: []
  references: []
  prerequisite: []
  extends: []
  comparison: []
---

---

## 문제

### Problem Statement

Given a string `num` representing a non-negative integer, and an integer `k`, return *the smallest possible integer after removing `k` digits from `num`.*

### Constraints

* 
* `num` consists of only digits.
* `num` does not have any leading zeros except for the zero itself.

---

### Examples

**Example 1:**

> **Input:** `num = "1432219"`, `k = 3`
> **Output:** `"1219"`
> **Explanation:** Remove the three digits `4`, `3`, and `2` to form the new number `1219` which is the smallest.

**Example 2:**

> **Input:** `num = "10200"`, `k = 1`
> **Output:** `"200"`
> **Explanation:** Remove the leading `1` and the number is `200`. Note that the output must not contain leading zeroes.

**Example 3:**

> **Input:** `num = "10"`, `k = 2`
> **Output:** `"0"`
> **Explanation:** Remove all the digits from the number and it is left with nothing which is `0`.

---

### 집중해야 할 부분

일단 영어라서 읽는 데 시간은 더 들지도 모르지만 Non-Negative Integer라고 본문에서 대놓고 말했다.
이 문제는 항상 0 혹은 자연수를 반환한다.

중요한 사실은 Leading Zero를 제거하라는 부분이다. 이것을 제거하는 것은 ltrim을 따로 함수로 짜면 어렵지 않고, 만약 우리가 실무 코드를 짠다면 데이터 노출 위험이 있는 포인터 연산을 피했겠지만 그런 상황이 아니니까 `while(*str != '0') str++; return str;`으로 간결한 처리를 해도 된다.

그리고 여기서 단조스택(Monotonic Stack)이라는 것이 나온다. 우리에게 익숙한 단조는 접쇠를 만들어서 두드리는 것, 혹은 음악에서의 마이너 스케일이라 와닿지 않지만, 한자로 보면 `單調`이기 때문에 `Mono / Tonic`을 직역한 것이다.

스택을 단조 스택으로서 활용하는 것은 패턴이 비슷하다.

한국어로 이와 같은 과정을 거친다.
```
인덱스를 돌기 {
    스택이 비지 않았으면서 스택의 Top이 조건에 부합할 때까지 {
        Top을 가져와서 그 값으로 필요한 연산을 하고, 그 Top은 스택에서 뽑아버린다.
    }
    스택에 현재 인덱스를 집어넣는다.
}
```

과정이나 원리는 단순하지만 문제를 보자마자 단조 스택을 바로 발명할 수 있는 사람은 드물 것이다. 그렇기 때문에 특정 조건을 만족하는 문제가 전체에 일괄 규칙이 있는 것이 아니고 문맥 상에서 발생할 때, 특히나 이 문제와 판박이일 때는 단조 스택을 암기해 뒀다가 그대로 응용하면 된다.

이 문제는 단조 스택과 인덱스를 활용한다는 데에 그 발상이 크게 연관되어 있다. 그러나 이러한 것을 날것의 인덱스/필요한 값으로 냅다 쓰면 코드를 짜다가 헷갈리기 좋다. C언어에선 구조체로, C++에서는 한 쌍의 묶음을 만들어 예쁘게 쓰는 것도 방법이다.

아래의 풀이는 기본적으로 유사 객체 지향으로 진행된다. 풀이는 아래와 같다.

### 풀이

```c
#include <string.h>

typedef struct Character {
    int index;
    char c;
} Character;

Character STACK[100001];
int top = -1;

void push(Character x) {
    top++;
    STACK[top] = x;
}

Character pop() {
    static Character placeholder; // placeholder to prevent underflow
    placeholder.index = -1      ;
    placeholder.c     = '\0'    ;

    if(top == -1) return placeholder; // return placeholder here
    Character ret = STACK[top];
    top--;
    return ret;
}

int stacking_location = -1;
void stack_char(char *arr, char c) {
    stacking_location++       ;
    arr[stacking_location] = c;
}

char *ltrim(char *str) {
    while(*str == '0') {
        str++;
    }
    return str;
}

char* removeKdigits(char* num, int k) {
    static char answer[100001];
    const size_t CHARACTER_ARRAY_SIZE = strnlen(num, 100001);
    Character numWithIndex[CHARACTER_ARRAY_SIZE];

    top = -1;
    stacking_location = -1;
    memset(answer, 0, sizeof(answer));

    // assign char-index pair
    for(int i = 0; i < CHARACTER_ARRAY_SIZE; i++) {
        numWithIndex[i].c     = num[i];
        numWithIndex[i].index = i     ;
    }

    int cnt = 0;
    for(int i = 0; i < CHARACTER_ARRAY_SIZE; i++) {
        while(top > -1 && STACK[top].c > numWithIndex[i].c && cnt < k) {
            Character c = pop()       ;
            if(c.index == -1) continue;

            num[c.index] = '\0';
            cnt++              ;
        }
        push(numWithIndex[i]);
    }

    // reduce if cnt < k
    while(cnt < k && top > -1) {
        Character c  = pop();
        num[c.index] = '\0';
        cnt++;
    }
    for(int i = 0; i < CHARACTER_ARRAY_SIZE; i++) {
        if(num[i] != '\0') {
            stack_char(answer, num[i]);
        }
    }
    char *final_answer = ltrim(answer);
    if(strlen(final_answer) == 0) {
        return "0";
    }
    return final_answer;
}
```


## 맺으며

이러한 것을 발상만 알면 언제나 떠올릴 수 있다고 하는 것은 그들만의 리그이다. 나와 같은 평범한 학생들은 원리만 안다고 바로 떠오를 리가 없다.
만약 누군가가 아주 비상한 지능을 가지고 있다면 그렇게 한다고 해도 괜찮다. 하지만 충분히 머리가 좋지 않다면 유형을 눈에 익혀두는 것이 중요하다.
