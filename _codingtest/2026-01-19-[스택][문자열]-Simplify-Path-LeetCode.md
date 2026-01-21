---
layout: knowledge-base
title: "[스택][문자열] Simplify Path-LeetCode"
subtitle: "유사 유닉스 스타일의 문자열을 파싱하자"
date: 2026-01-19 12:53 +0900
categories: [codingtest]
taxonomy:
  category: codingtest
  subcategory: algorithm-data-structure
  order: 1
difficulty: intermediate
keywords:
  - 문자열
  - 알고리즘
  - 스택
relationships:
  related: []
  references: []
  prerequisite: []
  extends: []
  comparison: []

---

## [LeetCode] 71. Simplify Path

### Problem Description

You are given an absolute path for a Unix-style file system, which always begins with a slash `/`. Your task is to transform this absolute path into its **simplified canonical path**.

The rules of a Unix-style file system are as follows:

* A single period `.` represents the current directory.
* A double period `..` represents the previous/parent directory.
* Multiple consecutive slashes such as `//` and `///` are treated as a single slash `/`.
* Any sequence of periods that does not match the rules above should be treated as a valid directory or file name. For example, `...` and `....` are valid directory or file names.

The **simplified canonical path** should follow these rules:

1. The path must start with a single slash `/`.
2. Directories within the path must be separated by exactly one slash `/`.
3. The path must not end with a slash `/`, unless it is the root directory.
4. The path must not have any single or double periods (`.` and `..`) used to denote current or parent directories.

---

### Examples

| Input | Output | Explanation |
| --- | --- | --- |
| `"/home/"` | `"/home"` | Trailing slash is removed. |
| `"/home//foo/"` | `"/home/foo"` | Consecutive slashes are replaced by a single one. |
| `"/home/user/Documents/../Pictures"` | `"/home/user/Pictures"` | `".."` refers to the parent directory. |
| `"/../"` | `"/"` | Going up from the root is not possible. |
| `"/.../a/../b/c/../d/./"` | `"/.../b/d"` | `"..."` is treated as a valid directory name. |

---

### Constraints

* `1 <= path.length <= 3000`
* `path` consists of English letters, digits, period `.`, slash `/`, or underscore `_`.
* `path` is a valid absolute Unix path.

---

### Visual Logic: Stack Operations

The most efficient way to solve this is using a **Stack** data structure.

1. **Tokenize**: Split the string by `/`.
2. **Process**:
* If token is `..`: `Pop` from stack (if not empty).
* If token is `.` or empty: `Ignore`.
* Otherwise: `Push` token to stack.


3. **Reconstruct**: Join stack elements with `/`.

---

## 문제 분석

실제 쉘에서는 예외 처리되는 ... 등을 여기서는 폴더명으로 허가하겠다고 했다.
여기서 일반적인 유닉스, 리눅스 PC와 동일하게 작동하는 것은 `.`과 `..`뿐이다.
그렇다면 폴더명은 푸시, `..`은 팝, `.`은 무시하면 그만이다.
그러나 나는 복잡한 알고리즘 문제가 아니고서야 C++보다 C를 기준으로 보고 공부했다.
C++의 스트링 함수, I/O 스트림 등을 위해 문서를 뒤질 시간에 직접 구현하면 된다.
그것을 쉽게 하기 위해서 이번에는 strdup을 배워 보자.

## strdup으로 시작하는 안전한 문자열 할당
strdup의 인자로 어떠한 문자열을 집어넣으면 공간을 알아서 동적 할당하고 복사까지 해서 시작 주소를 반환한다.
구체적으로 예시를 들어 비교해보자.

### 첫번째 방식
```c
char *str1 = "hello"                 ;
char *str2 = malloc(strlen(str1) + 1); // char * should end with null escape

memset(str2, 0, sizeof(str1) + 1) ;
strncpy(str1, str2, strlen(hello));
```

### 두번째 방식
```c
char *str1 = "hello"     ;
char *str2 = strdup(str1);
```

역시 strdup을 쓰면 코드가 보기 예쁘다. 이렇게 적용해서 쉬운 문자열 파싱을 하는 코드를 작성하자.

## 풀이

```c
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

char* simplifyPath(char* path) {
    char* stack[3001];
    int top = -1;

    // tokenize using strtok
    char* token = strtok(path, "/");
    while (token != NULL) {
        if (strcmp(token, ".") == 0) {
            // current directory. ignore
        } else if (strcmp(token, "..") == 0) {
            // parent directory. pop from stack if not empty
            if (top >= 0) {
                free(stack[top]); // always free unused memory
                top--;
            }
        } else {
            // normal directory. push to stack
            top++;
            stack[top] = strdup(token); // copy with strdup
        }
        token = strtok(NULL, "/");
    }

    // assemble the result string
    if (top == -1) return strdup("/");

    char* res = (char*)calloc(3001, sizeof(char));
    for (int i = 0; i <= top; i++) {
        strcat(res, "/");
        strcat(res, stack[i]);
        free(stack[i]); // free memory while assembling
    }

    return res;
}
```

여전히 어딘가 찜찜한 느낌이 있다. 코딩 테스트를 위한 코드라는 느낌이 너무 세다.
정석적인 코드에서 주석만 코딩 테스트 스타일로 간단하게 해서 다시 써 보자.


```c
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// global stack
char* stack[3001];
int top = -1;

void push(char* token) {
    top++;
    stack[top] = strdup(token); // copy token
}

void pop() {
    if (top >= 0) {
        free(stack[top]); // free memory
        top--;
    }
}

char* simplifyPath(char* path) {
    top = -1;
    char* saveptr; // pointer for reentrant state

    // tokenize by /
    char* token = strtok_r(path, "/", &saveptr);
    while (token != NULL) {
        if (strcmp(token, ".") == 0) {
            // ignore current dir
        } else if (strcmp(token, "..") == 0) {
            // pop if not empty
            pop();
        } else {
            // push directory
            push(token);
        }
        token = strtok_r(NULL, "/", &saveptr);
    }

    if (top == -1) return strdup("/");

    // build result
    char* res = (char*)calloc(3001, sizeof(char));
    for (int i = 0; i <= top; i++) {
        strcat(res, "/");
        strcat(res, stack[i]);
        free(stack[i]); // free after use
    }

    return res;
}
```

`strtok_r`, 분리된 스택, 함수의 명확한 역할..
역시 이래야 코드의 가독성이 좋다.
이러한 문제는 짧으니 대략적으로 해도 좋으나 긴 문제에선 한 함수에 모든 것을 모는 것은 C에선 절대 지양하도록 하자.
