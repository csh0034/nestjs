# Type System

TypeScript 타입 시스템의 핵심: `interface` vs `type`, generic, utility type, narrowing.

## interface vs type

둘 다 *타입의 모양*을 선언한다. 95% 의 경우 호환되며, 다음 차이만 알면 충분.

| 항목 | `interface` | `type` |
| --- | --- | --- |
| 객체 형태 | ✅ | ✅ |
| 유니온/인터섹션 | ❌ (직접 못 씀) | ✅ (`A \| B`, `A & B`) |
| 원시 별칭 | ❌ | ✅ (`type Id = string`) |
| **선언 병합** | ✅ (같은 이름 여러 번 → 합쳐짐) | ❌ |
| 확장 문법 | `extends` (다중 OK) | `&` (intersection), 객체형이면 `interface extends` 로도 받을 수 있음 |

> `extends` / `&` 는 *결과*는 비슷하지만 의미가 살짝 다르다. `interface B extends A` 는 충돌 멤버를 **에러**로 잡고, `type B = A & { ... }` 는 **intersection 으로 합쳐버린다**(때로는 `never` 가 됨). `interface` 는 `extends A, B, C` 처럼 *여러* 객체 타입을 받을 수도 있다.

```ts
interface User { id: string; name: string }
interface User { email: string }    // 병합됨 → User 는 3 필드

type UserT = { id: string; name: string };
type UserT = { email: string };     // ❌ 중복 선언 에러
```

관례 (TS 핸드북 권장):
- **공개 API/객체 모양**: `interface` 우선 (선언 병합으로 확장 가능)
- **유니온/매핑/조건부 타입**: `type` 만 가능

이 프로젝트는 도메인 포트(`UserRepository`)에 `interface`, DTO 매핑 결과에 `type` 을 섞어 쓴다.

출처: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces

---

## Union & Intersection

```ts
type Status = 'PENDING' | 'PAID' | 'CANCELED';   // 문자열 리터럴 유니온
type AdminUser = User & { role: 'admin' };       // intersection
```

문자열 리터럴 유니온은 Kotlin enum + sealed class 의 가벼운 대체로 자주 쓴다. 단, 런타임 enum 객체가 필요하면 `enum`/`const` 객체를 명시 (이 프로젝트의 `OrderStatus` 는 `enum`).

---

## Discriminated Union (구분 유니온)

Kotlin sealed class 와 가장 가까운 패턴.

```ts
type Event =
  | { kind: 'created'; userId: string }
  | { kind: 'canceled'; reason: string };

function handle(e: Event) {
  switch (e.kind) {
    case 'created':  return e.userId;   // 여기서 e 는 created 분기로 좁혀짐
    case 'canceled': return e.reason;
  }
}
```

`kind`/`type` 같은 **discriminant 필드**가 핵심. switch/if 안에서 자동으로 좁혀진다.

---

## Generic

Kotlin generic 과 거의 동일. 차이는 **reified 가 없다는 점**.

```ts
function first<T>(xs: T[]): T | undefined { return xs[0]; }

class Box<T> { constructor(public value: T) {} }

interface Repository<T, ID = string> {  // ID 기본값
  findById(id: ID): Promise<T | null>;
}
```

제약(`extends`):

```ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

`K extends keyof T` → `T` 의 키 중 하나로 제한. Kotlin `where T : Comparable<T>` 와 유사한 위치.

**Reified 없음**: 함수 안에서 `T` 자체를 런타임에 못 본다. 필요하면 별도 인자로 클래스/스키마를 받아야 함 (`func(MyClass, ...)`).

---

## Utility Types (표준 제공)

자주 쓰는 것만 추림. 모두 *기존 타입에서 새 타입을 파생*.

| 유틸리티 | 의미 | 예 |
| --- | --- | --- |
| `Partial<T>` | 모든 필드를 선택형으로 | `Partial<User>` → `{ id?: string; ... }` |
| `Required<T>` | 모든 필드를 필수로 | `Required<Config>` |
| `Readonly<T>` | 모두 readonly | `Readonly<Order>` |
| `Pick<T, K>` | 특정 키만 추출 | `Pick<User, 'id' \| 'email'>` |
| `Omit<T, K>` | 특정 키 제외 | `Omit<User, 'password'>` |
| `Record<K, V>` | 키 → 값 매핑 | `Record<string, number>` |
| `Awaited<T>` | `Promise<X>` → `X` | `Awaited<Promise<User>>` = `User` |
| `ReturnType<F>` | 함수 반환 타입 | `ReturnType<typeof getUser>` |
| `Parameters<F>` | 함수 인자 튜플 | `Parameters<typeof getUser>` |

```ts
// Update DTO: id 제외하고 모두 옵션
type UpdateUserDto = Partial<Omit<User, 'id'>>;
```

전체 목록: https://www.typescriptlang.org/docs/handbook/utility-types.html

---

## Narrowing (타입 좁히기)

런타임 코드로 *컴파일러가 타입을 더 좁게 추론*하게 만드는 기법. Kotlin smart cast 와 비슷하지만 명시적 패턴이 더 많다.

```ts
function len(x: string | string[]): number {
  if (typeof x === 'string') return x.length;   // 여기선 string
  return x.length;                              // 여기선 string[]
}
```

좁히기 도구:

| 도구 | 용도 |
| --- | --- |
| `typeof x === 'string'` | 원시형 |
| `Array.isArray(x)` | 배열 |
| `x instanceof Foo` | 클래스 (interface ❌) |
| `'email' in x` | 객체에 키 존재 |
| `x === null` / `x !== undefined` | null 좁히기 |
| **타입 가드 함수** | 커스텀 좁히기 |
| **assertion 함수** | 통과 못 하면 throw |

### 타입 가드 함수 (`x is T`)

```ts
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'email' in x;
}

if (isUser(data)) {
  data.email;   // User 로 좁혀짐
}
```

### Assertion 함수 (`asserts x is T`)

```ts
function assertUser(x: unknown): asserts x is User {
  if (!isUser(x)) throw new Error('not a user');
}

assertUser(data);
data.email;     // 이후 코드 전체에서 User
```

Kotlin `requireNotNull(x)` 이후 smart cast 와 같은 사용감.

---

## `keyof`, `typeof`, indexed access

```ts
type UserKey = keyof User;            // "id" | "name" | "email"
type EmailType = User['email'];        // string (indexed access)
type Cfg = typeof config;              // 변수에서 타입 추출
```

`typeof` 는 *값을 타입으로 끌어올리는* 연산자. 런타임 `typeof x === 'string'` 의 `typeof` 와 키워드는 같지만 위치가 다름 (타입 위치 vs 값 위치).

---

## Conditional Types (가볍게)

```ts
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<string[]>;   // true
type B = IsArray<string>;     // false
```

`Awaited<T>`, `ReturnType<F>` 같은 유틸리티가 모두 이걸로 구현되어 있음. 일상 코드에서 직접 작성할 일은 드물고, 표준 유틸리티 사용이 일반적.

---

## 안티패턴

- `any` 남발 — 타입 시스템을 꺼버리는 효과. 외부 라이브러리 미타입 대응에만 한정. 그조차 가능하면 `unknown` + 좁히기로 처리
- `as Foo` (단언) 남발 — 컴파일러를 *속이는* 것. 타입 가드 함수가 옳은 길
- `Object` / `{}` 타입 — "아무거나" 라는 뜻이 아님. `unknown` 을 써라
- `enum` 을 *문자열 리터럴 유니온*으로 대체 가능한 곳에 굳이 사용 — 트리 셰이킹/번들 사이즈에 손해. 단, MikroORM `@Enum` 처럼 *런타임 객체*가 필요하면 enum 유지 (이 프로젝트의 `OrderStatus`)

## 공식 문서

- Everyday Types: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html
