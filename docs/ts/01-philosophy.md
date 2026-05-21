# TypeScript 개요

TypeScript 공식 문서(typescriptlang.org)에 명시된 정의·컴파일 모델·핵심 특성을 Kotlin 경험자 관점에서 정리.

## 정의

> TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. — *typescriptlang.org*

핵심:
- **JavaScript 의 superset** — 모든 유효한 JS 는 유효한 TS
- 컴파일러(`tsc`)가 **JavaScript 로 트랜스파일** — 런타임은 그냥 JS
- 타입은 **컴파일 타임에만 존재**, 런타임에는 사라짐 (*type erasure*)
- **구조적 타이핑(structural typing)** — 이름이 아니라 *모양*으로 호환성 판단

출처: https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html

---

## Kotlin / Java 와 가장 다른 3가지

| 항목 | Kotlin/Java | TypeScript |
| --- | --- | --- |
| 타입 호환 | **이름 기반(nominal)** — `class Foo`/`class Bar` 가 같은 모양이어도 다른 타입 | **구조 기반(structural)** — 모양이 같으면 호환 |
| 런타임 타입 | JVM 리플렉션으로 클래스 메타정보 그대로 보존 | `interface`/`type` 은 사라짐. `class` 만 남음 |
| nullability | `String` vs `String?` (타입 시스템 일급 시민) | `string` vs `string \| undefined` (유니온으로 표현) |

### 구조적 타이핑 예시

```ts
interface HasName { name: string }

class User {
  constructor(public name: string, public email: string) {}
}

function greet(x: HasName) { console.log(x.name); }
greet(new User('a', 'a@x')); // OK — User 는 name 을 가지므로 HasName 과 호환
```

Kotlin 이라면 `User : HasName` 을 명시해야 한다. TS 는 모양만 맞으면 통과.

### Type Erasure 예시

```ts
interface UserRepository { save(u: User): Promise<void>; }

// ❌ 컴파일은 되지만 런타임에 동작 불가능
// 'UserRepository' 는 JS 로 컴파일되면 사라짐
function get(token: any) { return container.get(token); }
get(UserRepository);
```

NestJS 가 인터페이스 주입에 **Symbol 토큰**을 강제하는 이유다 (`USER_REPOSITORY = Symbol(...)`). 자세히는 [[07-decorators]] 참고.

---

## 컴파일 파이프라인

```
.ts 소스
  ↓ tsc (TypeScript Compiler)
  ↓ 1) 타입 체크 (실패 시 에러)
  ↓ 2) JS 로 트랜스파일 (타입 정보는 모두 제거)
  ↓ 3) (옵션) decorator metadata, source map 등 부가 출력
.js 산출물 + .d.ts (타입 선언만 따로)
```

- **`.ts`** — 소스 (타입 + 런타임 코드)
- **`.d.ts`** — 타입 선언 파일. JS 라이브러리(`@types/node` 등)에 타입을 입혀줌
- **`.js`** — 실제 실행되는 산출물

이 프로젝트의 `tsconfig.json` 옵션 해설은 [[08-tsconfig]] 에서 다룬다.

---

## "타입은 런타임에 없다" 가 의미하는 것

```ts
function isUser(x: unknown): x is User {
  // ❌ if (x instanceof UserType) — interface 는 못 씀
  // ✅ class 라면 instanceof, 아니면 속성 검사
  return typeof x === 'object' && x !== null && 'email' in x;
}
```

런타임에 형 검사를 하려면:
1. `class` 를 만들고 `instanceof` 사용
2. **타입 가드 함수** (`x is User` 반환)
3. `typeof` / `in` / `Array.isArray` 같은 JS 기본 연산
4. `zod`/`class-validator` 같은 **런타임 스키마 검증 라이브러리**

자세한 좁히기 규칙은 [[02-type-system]] 의 "Narrowing" 참고.

---

## TS 의 "점진적 타입(gradual typing)"

```ts
let v: any = ...;     // 타입 검사 끔 (가능한 한 피한다)
let v: unknown = ...; // 타입 알 수 없음. 사용 전 좁히기 강제
```

| 키워드 | 의미 | Kotlin 대응 |
| --- | --- | --- |
| `any` | 타입 검사 해제. 무엇이든 통과 | (대응 없음, `Any?` 보다 훨씬 헐겁다) |
| `unknown` | 알 수 없는 값. 좁히기 없이는 못 씀 | `Any?` 에 가깝지만 더 엄격 |
| `never` | 절대 도달 안 함 (예외/무한루프 반환 타입) | `Nothing` |
| `void` | 반환값 없음 | `Unit` |

원칙: `any` 는 *escape hatch*. 가능한 한 `unknown` + narrowing 으로 처리.

---

## 표현 컨벤션 (관용)

- 클래스/타입: `PascalCase` (`UserRepository`)
- 변수/함수: `camelCase` (`getUser`)
- 상수/심볼: `UPPER_SNAKE_CASE` (`USER_REPOSITORY`)
- 인터페이스: **`I` 접두 붙이지 않는다** — TS 커뮤니티는 `IUser` 가 아니라 `User` 선호 (Kotlin/Java 의 `IUserService` 패턴과 반대)
- 파일명: `user.repository.ts` 처럼 *케밥 + 역할 접미*. NestJS 컨벤션이 이걸 강제

---

## 함께 보기

- [02-type-system.md](./02-type-system.md) — interface/type/generic/utility/narrowing
- [03-null-and-undefined.md](./03-null-and-undefined.md) — null 처리, optional, non-null assertion
- [04-classes.md](./04-classes.md) — class, parameter property, abstract
- [05-modules.md](./05-modules.md) — ES module, import/export
- [06-async-and-promises.md](./06-async-and-promises.md) — Promise, async/await
- [07-decorators.md](./07-decorators.md) — decorator + reflect-metadata
- [08-tsconfig.md](./08-tsconfig.md) — 이 프로젝트의 컴파일 옵션 해설

## 공식 문서

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- TS for Java/C# Programmers: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-oop.html
