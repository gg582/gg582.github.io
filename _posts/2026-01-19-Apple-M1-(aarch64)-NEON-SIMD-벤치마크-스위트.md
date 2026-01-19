---
layout: knowledge-base
title: "Apple M1 (aarch64) NEON SIMD 벤치마크 스위트"
subtitle: "Asahi Linux 환경에서의 ARM NEON 성능 분석"
date: 2026-01-19 18:00:00 +0900
categories: [blog]
taxonomy:
  category: general
  subcategory: general-system
  order: 3
difficulty: intermediate
keywords:
  - M1
  - ARM64
  - SIMD
  - NEON
  - Linux
  - Benchmark
---

## 테스트 환경

* **OS**: Fedora Linux Asahi Remix 43 (KDE Plasma Desktop Edition)
* **Host**: Apple MacBook Pro (13-inch, M1, 2020)
* **Kernel**: Linux 6.17.12-400.asahi.fc43.aarch64+16k
* **Compiler**: gcc (Fedora 15.0.0) with `-O3 -mcpu=apple-m1`

---

## 벤치마크 결과

캐싱 노이즈를 최소화하고 순수 연산 처리량(Throughput)을 측정하기 위해 대규모 데이터 스케일로 진행한다.

| 카테고리 | 작업 내용 | Scalar 시간 | NEON 시간 | 속도 향상(Speedup) |
| :--- | :--- | :--- | :--- | :--- |
| **Arithmetic** | 1억 개 배열 덧셈 | 0.1252s | 0.0696s | **1.80x** |
| **Bitwise** | 100MB Population Count | 0.4119s | 0.0148s | **27.83x** |
| **Math (FPU)** | 표준 sqrtf | 0.0471s | 0.0084s | **5.55x** |
| **Math (FPU)** | Fast Inverse Sqrt | 0.0471s | 0.0048s | **9.71x** |
| **String** | 100MB 문자 스캐닝 | 0.0527s | 0.0304s | **1.73x** |
| **Branchless** | 5000만 개 데이터 필터링 | 0.9323s | 0.8887s | **1.05x** |

<br>

<div class="benchmark-visual-wrapper" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 100%; margin: 2rem 0;">
    
    <!-- Speedup Chart -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; font-size: 1.1em; color: #343a40; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; margin-bottom: 15px;">🚀 속도 향상 (Speedup Factor)</h3>
        
        <!-- Bar Item -->
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">Bitwise (PopCount)</span>
                <span style="font-weight: bold; color: #d63384;">27.83x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #faa2c1, #d63384); border-radius: 6px;"></div>
            </div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">Math (Fast InvSqrt)</span>
                <span style="font-weight: bold; color: #d63384;">9.71x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 34.89%; height: 100%; background: linear-gradient(90deg, #faa2c1, #d63384); border-radius: 6px;"></div>
            </div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">Math (sqrt)</span>
                <span style="font-weight: bold; color: #d63384;">5.55x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 19.94%; height: 100%; background: linear-gradient(90deg, #faa2c1, #d63384); border-radius: 6px;"></div>
            </div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">Arithmetic (Array Add)</span>
                <span style="font-weight: bold; color: #d63384;">1.80x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 6.47%; height: 100%; background: linear-gradient(90deg, #faa2c1, #d63384); border-radius: 6px;"></div>
            </div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">String (Scanning)</span>
                <span style="font-weight: bold; color: #d63384;">1.73x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 6.21%; height: 100%; background: linear-gradient(90deg, #faa2c1, #d63384); border-radius: 6px;"></div>
            </div>
        </div>

        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #495057;">Branchless (Filtering)</span>
                <span style="font-weight: bold; color: #868e96;">1.05x</span>
            </div>
            <div style="background-color: #e9ecef; height: 12px; border-radius: 6px; overflow: hidden;">
                <div style="width: 3.77%; height: 100%; background: #adb5bd; border-radius: 6px;"></div>
            </div>
        </div>
        <p style="font-size: 0.8em; color: #868e96; text-align: right; margin-top: 10px;">* 막대 길이가 길수록 성능 향상 폭이 큼</p>
    </div>

    <!-- Time Comparison Chart -->
    <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
        <h3 style="margin-top: 0; font-size: 1.1em; color: #343a40; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; margin-bottom: 15px;">⏱️ 실행 시간 비교 (Execution Time)</h3>
        
        <!-- Legend -->
        <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 0.85em;">
            <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #ced4da; margin-right: 5px; border-radius: 2px;"></div> Scalar (기본)</div>
            <div style="display: flex; align-items: center;"><div style="width: 12px; height: 12px; background: #339af0; margin-right: 5px; border-radius: 2px;"></div> NEON (최적화)</div>
        </div>

        <!-- Row: Bitwise -->
        <div style="margin-bottom: 15px; border-bottom: 1px dashed #f1f3f5; padding-bottom: 10px;">
            <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; color: #495057;">Bitwise (PopCount)</div>
            <!-- Scalar Bar -->
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 100%; height: 100%; background: #ced4da;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #343a40;">0.4119s</span>
                </div>
            </div>
            <!-- NEON Bar -->
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 3.6%; height: 100%; background: #339af0; min-width: 2px;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #1864ab; font-weight: bold;">0.0148s</span>
                </div>
            </div>
        </div>

        <!-- Row: Math InvSqrt -->
        <div style="margin-bottom: 15px; border-bottom: 1px dashed #f1f3f5; padding-bottom: 10px;">
            <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; color: #495057;">Math (Fast InvSqrt)</div>
            <!-- Scalar Bar -->
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 100%; height: 100%; background: #ced4da;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #343a40;">0.0471s</span>
                </div>
            </div>
            <!-- NEON Bar -->
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 10.2%; height: 100%; background: #339af0; min-width: 2px;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #1864ab; font-weight: bold;">0.0048s</span>
                </div>
            </div>
        </div>

        <!-- Row: Branchless -->
        <div style="margin-bottom: 15px; border-bottom: 1px dashed #f1f3f5; padding-bottom: 10px;">
            <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; color: #495057;">Branchless (Filtering)</div>
             <!-- Scalar Bar -->
             <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 100%; height: 100%; background: #ced4da;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #343a40;">0.9323s</span>
                </div>
            </div>
            <!-- NEON Bar -->
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1; background: #f1f3f5; height: 18px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="width: 95.3%; height: 100%; background: #339af0;"></div>
                    <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 0.75em; color: #fff; font-weight: bold; text-shadow: 0 0 2px rgba(0,0,0,0.5);">0.8887s</span>
                </div>
            </div>
        </div>
        
        <p style="font-size: 0.8em; color: #868e96; text-align: right; margin-top: 10px;">* 시간이 짧을수록 성능이 좋음 (대표 케이스만 표시)</p>
    </div>
</div>

---

## 주목할 점

### 1. 비트 연산의 압도적 효율성
- Population Count에서 보여준 **27.83배**의 성능 향상
`vcntq_u8` 및 `vaddvq_u8` intrinsics를 활용하여 `__builtin_popcount`의 직렬 병목 현상을 우회
  - 사이클당 16바이트를 처리
  - 고성능 데이터베이스 인덱싱 및 데이터 압축에서 핵심적인 역할

### 2. 역제곱근(Inverse Square Root) 최적화
- 제곱근 연산에서 **9.71배**의 속도 향상을 기록
`vrsqrteq_f32`(Reciprocal Square Root Estimate) 명령어의 효율성을 증명한다. 3D 물리 엔진이나 실시간 신호 처리 시뮬레이션에서 필수적인 최적화 기법이다.

### 3. 분기(Branching)와 필터링의 한계
데이터 필터링 벤치마크는 **1.05배**에 그쳤다.
이는 SIMD가 연산 능력은 뛰어나지만, 조건부 메모리 쓰기와 같은 데이터 의존적 분기 처리에서는 병렬 실행의 이점이 제한적임을 보여준다.
이를 해결하기 위해 `vqtbl1q_u8` 등을 이용한 zero-copy 셔플 최적화가 필요할 수 있으나, 최적화 비용에 비해 얻는 이득이 낮다.

---

## 빌드 및 실행 방법

대상 시스템이 NEON을 지원하는 `aarch64` 아키텍처인지 확인해야 한다.
실험은 Apple M1(2020) 환경에서 이루어졌다.

```bash
# 레포지토리 클론
git clone [https://github.com/gg582/m1-arm-linux-neon-simd-benchmark.git](https://github.com/gg582/m1-arm-linux-neon-simd-benchmark.git)
cd m1-arm-linux-neon-simd-benchmark

# 최적화 플래그를 사용하여 빌드
make

# 특정 벤치마크 실행
./simd_popcount_bench

# 전체 벤치마크 실행
make benchmark

```

### 권장 GCC 플래그

```bash
gcc -O3 -mcpu=apple-m1 -fsimd-cost-model=unlimited -march=armv8-a+simd

```

## 생각할 거리

이러한 특정 아키텍처에서 지원되는 고성능 함수들은 판도라의 상자일지도 모른다. 타겟 아키텍처로 흔하게 사용되는 amd64, arm64, risc-v 등에 대한 아키텍처 종속적 최적화를 하는 것은 흔하게 보인다.
하지만 잘 알려지지 않은 아키텍처(예를 들면 중화권에서 사용되는 룽손64) 등에 대해 모두 최적화 코드를 작성하기 시작하면 유지 보수 비용은 하늘을 뚫고 날아가 버린다.
특히 많은 경우에 이런 최적화는 C언어에서 이렇게 간단하게 할 수 있는 것이 아닌 인라인 어셈블리를 요구하는데, 수십 개의 아키텍처에 대해서 비트를 하나하나 검증하는 것은 고문일 수 있다.

그러나 아키텍처가 정해진 초고성능 데이터베이스 관리 시스템을 운용해야 하는데, RDBMS가 어디에서나 다 돌아갈 만한 범용 함수들로만 짜여져 있다면 성능 병목이 빠르게 온다. 이러한 상황에서는 저수준 최적화를 하는 것이 하지 않는 것보다 유지 보수 비용, 관리 비용, 요구 하드웨어 등이 더욱 유리하다. 고성능 RDBMS 서버라고 하면 끽해야 AMD64, ARM64, POWER, IA64 중에 있을 것이므로 안 하는 것이 손해이다.

이러한 기술이 저지연 임베디드 기기, 고성능 서버, 게임 프로그래밍 등에서 자주 쓰인다는 점을 부정할 수 없다. 하지만 "이런 저수준 최적화도 하지 않는 고수준 개발자들은 무능하다"고 말해 버리는 것은 고수준 언어에 대한 이해를 하고자 하는 일말의 양심조차 없는 태도일지 모른다.

기술자에게 성능은 매혹적인 주제이다. 하지만 이 모든 것을 책임질 수 있는 구조가 있는지, 구조는 얼마나 지탱될 수 있는지도 생각하지 않은 채 무작정 진행하는 최적화는 때로는 개악일 수 있다.

나는 전문 기술자도 아닐 뿐더러 재미삼아 IT를 훑고 지나갈 뿐이지만, 어셈블리 최적화, RIIR, 모던 C/C++이 무분별하게 남용되는 현 시점에서 한 번쯤은 짚어볼 필요가 있다고 생각한다.
