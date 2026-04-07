---
layout: knowledge-base
title: "[레거시][MyBatis]-레거시-유지보수-MyBatis에서-위험한-구문들"
subtitle: "레거시는 여전히 흔하고, 안전은 중요하다"
date: 2026-03-12 14:00:00 +0900
categories: [blog]
taxonomy:
  category: general
  subcategory: general-tools
  order: 1
difficulty: beginner
keywords:
  - MyBatis
  - Q/A
  - CLI
relationships:
  related: []
  references: []
  prerequisite: []
  extends: []
  comparison: []
---

# MyBatis의 취약할 수 있는 호출들

우선 이것은 최신 스프링 부트에 대한 이야기가 아니다. 물론 신입부터 OpenJDK 21에서 최신 스프링부트를 다루는 회사가 있을 수도 있겠지만 대부분의 경우 신입은 레거시 솔루션에 대한 Q/A부터 시작하게 된다. 이러한 상황에서 회사에서 배워갈 수 있는 것은 최대한 배워 간다고 생각하며 MyBatis의 취약점에 대해 일부 정리한다.

## 외부로 드러나는 데에는 치환이 아닌 바인딩을 써야 한다.

MyBatis에서는 쿼리를 발생시키기 위한 방식으로 파라미터 바인딩과 치환이 있다.
치환의 경우 내부적으로 테이블명이나 컬럼명, ORDER BY 절 등을 직접적으로 다룰 때는 사용하지만 일반적인 CRUD에서 사용해서는 안 된다. 기본적으로 치환은 말 그대로 구문을 가져다가 그 자리에 붙여 넣는 것처럼 동작한다. 이러한 것을 악용하면 `DROP TABLE userdata;`같은 위험한 구문을 그대로 삽입시키는 SQL 인젝션이 가능할 수 있다.
그러하기에 외부로 노출되는 것에는 파라미터 바인딩을 이용해서 쿼리 재사용, SQL 인젝션 금지, 따옴표 처리 등을 적용해서 개발한다.
파라미터 바인딩은 따옴표 처리, 인젝션 방어, 쿼리 재사용 등이 모두 함축되어 있다. 그러나 `${}`로 된 치환 방식에서 `#{}`로 변경 후 약간만 손을 보면 쉽게 소프트웨어 보안을 강화할 수 있다.

### 손쉬운 수정, 뛰어난 효과

```xml
<select id="findUserById" resultType="User">
    SELECT * FROM users
    WHERE user_id = ${userId}
</select>
```

```xml
<select id="findUserById" resultType="User">
    SELECT * FROM users
    WHERE user_id = #{userId}
</select>
```

단순히 이렇게만 치환하면 곧바로 로우 쿼리가 날아가는 일을 방지한다. 이를 통하여 간단하게 해결한다.

## 솔직히 말하자면...

이런 레거시는 고객사의 요구 사항이 아니라면 안 쓰는 것이 낫다고 생각한다. 그럼에도 불구하고 이런 방식을 고집해야만 하는 까닭이 있다면 아마 고집이 아닌가. 유지보수가 아닌 신규 개발에서 이것을 사용하겠다고 하는 것은 솔직히 회의감이 든다. 다른 좋은 방법이 많다. 이것은 단순히 요즘 시대에 C나 포트란으로 백엔드를 하지 말라는 시대의 담론이나 편견보다는 더 직접적인 부분이라고 생각한다.
