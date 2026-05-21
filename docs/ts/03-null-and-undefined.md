# null & undefined

TypeScript 는 *두 개의 비어 있음*을 구분한다. Kotlin 의 `null` 하나만 다루던 입장에서 가장 헷갈리는 부분.

## null vs undefined — 의미 구분

| 값 | 의미 | 언제 |
| --- | --- | --- |
| `undefined` | **할당된 적 없음** | 변수 선언만 하고 값을 안 줬을 때, 함수가 명시 return 안 했을 때, 옵셔널 인자 누락, 객체에 없는 키 접근 |
| `null` | **명시적으로 비어 있다고 표시** | 개발자가 의도적으로 "값 없음" 을 표현 |

Kotlin `String?` 의 `null` 은 두 개념을 합쳐놓은 것에 가깝다. TS 에서는 둘이 별개 값이고 별개 타입.

```ts
let a: string | undefined;   // 할당 안 됨
let b: string | null = null; // 명시적 비어있음

a === b;  // false — 서로 다른 값
a == b;   // true  — 느슨 비교는 둘을 같게 침
```

**관례**: 대부분 TS 코드는 `undefined` 를 우선시한다. `null` 은 외부 시스템(JSON 응답, DB 결과)에서 들어올 때 주로 본다. 도메인 모델 안에서는 `undefined` 만 쓰는 것이 단순.

---

## strictNullChecks

`tsconfig.json` 의 `strictNullChecks: true` (이 프로젝트 적용됨) 가 있어야 비로소 null/undefined 가 별도 타입으로 분리된다.

```ts
// strictNullChecks: true
function len(s: string) { return s.length; }
len(null);   // ❌ 에러
len(undef);  // ❌ 에러

function len2(s: string | null) { return s.length; }   // ❌ s 가 null 일 수 있음
function len3(s: string | null) {
  if (s === null) return 0;
  return s.length;   // 여기서 string 으로 좁혀짐
}
```

`strict: true` 안에 `strictNullChecks` 가 포함되어 있다. 끄면 Kotlin 의 *platform type* 같은 위험한 상태가 되니 절대 끄지 말 것.

---

## Optional Property `?:`

```ts
interface User {
  id: string;
  email?: string;          // 있을 수도 없을 수도
}
```

`email?: string` 은 실질적으로 `email: string | undefined` 와 비슷하지만 다음 차이가 있다:

| 표기 | 의미 |
| --- | --- |
| `email?: string` | 키 자체가 없을 수 있고, 있더라도 `undefined` 일 수 있음 |
| `email: string \| undefined` | 키는 *반드시* 있어야 함. 단 값이 `undefined` 일 수 있음 |

```ts
const u1: User = { id: 'x' };               // ✅ email 키 자체 없음
const u2: { email: string | undefined } = {}; // ❌ email 키 필요
```

`exactOptionalPropertyTypes` 옵션을 켜면 둘의 구별이 더 엄격해진다 (이 프로젝트는 비활성).

---

## Optional Chaining `?.` / Nullish Coalescing `??`

Kotlin 의 `?.` / `?:` 와 거의 동일.

```ts
const role = req.headers['x-role']?.toLowerCase();  // headers 가 없으면 undefined
const port = config.port ?? 3000;                    // null/undefined 일 때만 기본값

// ❌ 자주 하는 실수: || 와 ?? 혼동
const port2 = config.port || 3000;
//  port 가 0 일 때도 3000 으로 → 의도와 다름
```

| 연산자 | 폴백 조건 |
| --- | --- |
| `\|\|` | falsy 전부 (`0`, `''`, `false`, `null`, `undefined`, `NaN`) |
| `??` | `null` 과 `undefined` 만 |

**숫자/문자열 기본값에는 `??` 를 써라.** `||` 는 `0`/`''` 도 폴백시킨다.

이 프로젝트의 `aggregate-root.ts`:

```ts
hasDomainEvents(): boolean {
  return (this._domainEvents?.length ?? 0) > 0;
}
```

`_domainEvents` 가 `undefined` 면 `?.length` 결과가 `undefined` → `?? 0` 으로 폴백.

---

## Non-null Assertion `!`

```ts
const el = document.getElementById('app')!;  // null 아닐 거라고 단언
```

Kotlin `!!` 와 같다. **컴파일러를 속이는 것**이므로 가능한 한 피하고, 정말 확실한 위치에서만 사용.

MikroORM 엔티티 필드에서 자주 본다:

```ts
@PrimaryKey({ type: 'uuid' })
id!: string;       // ! = "초기화는 ORM/팩토리가 책임진다"
```

`strictPropertyInitialization` 을 만족시키려는 *정의적 할당 단언(definite assignment assertion)*. 의미는 다르다 — "지금은 비어있어 보이지만 사용 시점엔 채워져 있음을 책임진다".

---

## `null` 좁히기 패턴

```ts
function getName(u: User | null | undefined): string {
  if (u == null) return 'anonymous';   // null/undefined 둘 다 잡음 (== 의 드문 정당한 사용)
  return u.name;                        // User
}
```

`x == null` 는 *모범적인 거의 유일한 `==` 사용처*. 두 비어있음을 한번에 처리하고 싶을 때.

---

## 안티패턴

- `strictNullChecks` 끄기 → 모든 타입에 null 가능성이 묻혀버림. 실수의 근원
- `as User` 로 `User | null` 을 강제 캐스팅 → 런타임 폭탄
- `!` 남발 → Kotlin `!!` 남발과 같은 문제. 좁히기/방어 코드로 대체
- 도메인에서 `null` 과 `undefined` 둘 다 허용 (`User | null | undefined`) → 항상 하나로 통일

## 공식 문서

- Strict Null Checks: https://www.typescriptlang.org/tsconfig#strictNullChecks
- Narrowing — `null` 처리: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
