# Async & Promises

JS 의 비동기는 **이벤트 루프 + Promise** 모델이다. Kotlin 코루틴과 *결과적 사용감*은 비슷하지만 내부 동작은 다르다.

## Promise 기본

```ts
const p: Promise<User> = userRepo.findById('1');

p.then(u => console.log(u))
 .catch(err => console.error(err))
 .finally(() => console.log('done'));
```

Promise 는 3가지 상태:
- **pending** — 아직 안 끝남
- **fulfilled** — 성공 (`.then` 의 인자)
- **rejected** — 실패 (`.catch` 의 인자)

한 번 결정되면(*settled*) 상태가 다시 바뀌지 않는다. Kotlin `Deferred` 와 거의 같은 모델.

---

## async / await

`async` 함수는 항상 `Promise<T>` 를 반환. `await` 는 *Promise 가 settle 될 때까지 함수 실행을 멈춤*.

```ts
async function getUser(id: string): Promise<User> {
  const u = await userRepo.findById(id);
  if (!u) throw new NotFoundException();
  return u;
}
```

타입 추론:
- 함수에 `async` 가 붙으면 반환 타입이 자동으로 `Promise<...>` 로 감싸짐
- `await p` 의 결과 타입은 `Awaited<typeof p>` (대부분 `Promise<T>` 의 `T`)

---

## Kotlin 코루틴과의 비교

| 항목 | Kotlin Coroutine | TS async/await |
| --- | --- | --- |
| 일시중단 단위 | suspend function | async function |
| 결과 핸들 | `Deferred<T>` | `Promise<T>` |
| 실행 시점 | `launch` / `async` 빌더 명시 | **함수 호출 즉시 시작** |
| 취소 | structured concurrency, `cancel()` | **표준 취소 없음** (`AbortController` 별도) |
| 컨텍스트 | `CoroutineContext`, dispatcher | (없음) — 항상 이벤트 루프 |
| 병렬 | `coroutineScope { launch ...; launch ... }` | `Promise.all([...])` |

### 가장 큰 함정: **호출 즉시 실행**

```ts
const p = doWork();   // ← 이미 시작됨. await 안 해도 진행됨
await p;              // 결과 받기
```

Kotlin `async { ... }` 는 빌더 호출 시점 = 시작이지만, *명시적 빌더가 필요*해서 의도가 분명. TS 는 `async` 함수를 *그냥 부르면* 시작. `await` 누락이 자주 버그가 된다.

---

## 동시성 패턴

```ts
// 직렬 — 1 끝나야 2 시작
const a = await loadA();
const b = await loadB(a);

// 병렬 — 동시에 시작, 다 끝나면 받음
const [users, products] = await Promise.all([loadUsers(), loadProducts()]);

// 가장 빠른 것 하나 (다른 건 그대로 진행됨, 메모리 누수 주의)
const first = await Promise.race([slowApi(), timeout(1000)]);

// 모두 settle 되길 기다림 (성공/실패 무관)
const results = await Promise.allSettled([a(), b(), c()]);
// results: [{status:'fulfilled', value:...} | {status:'rejected', reason:...}, ...]
```

| API | 짧은 설명 |
| --- | --- |
| `Promise.all` | 모두 성공해야 통과. 하나라도 실패하면 즉시 reject |
| `Promise.allSettled` | 모두 끝나면 결과 배열 |
| `Promise.race` | 가장 먼저 settle 되는 결과 |
| `Promise.any` | 가장 먼저 *성공* 하는 결과 |

---

## 예외 처리

```ts
try {
  const u = await getUser(id);
} catch (err) {
  // err 는 unknown 타입. 좁히기 필요
  if (err instanceof NotFoundException) { /* ... */ }
}
```

`async` 함수 안에서 throw 한 예외 = 그 Promise 의 reject 사유. `try/catch` 로 잡을 수 있다.

**비동기 예외의 함정**:

```ts
// ❌ catch 가 안 잡는다 — await 가 없어서 외부로 빠져나가버림
try {
  doAsync();   // Promise 반환만 하고 끝
} catch (e) { /* ... */ }

// ✅
try {
  await doAsync();
} catch (e) { /* ... */ }
```

NestJS 컨트롤러/UseCase 에서 `async` 메서드의 return 을 그대로 두면 프레임워크가 알아서 await — 직접 try/catch 안 해도 ExceptionFilter 가 처리. 하지만 *Promise 를 변수에 받아두고 await 안 하는* 코드는 위험.

---

## "Promise 를 잊지 마라" (floating promise)

```ts
async function send() { ... }

send();   // ⚠️ Promise 가 떠다님 (floating). 실패해도 알 수 없음
```

ESLint 규칙 `@typescript-eslint/no-floating-promises` 가 잡아준다. 의도적으로 무시할 거면 `void send();` 로 명시.

NestJS 의 EventEmitter 핸들러가 async 인 경우 floating 처리됨 — 비즈니스 로직에선 명시적으로 await 또는 try/catch 로 안전망.

---

## Promise vs RxJS Observable (NestJS Interceptor 관련)

| 항목 | Promise | RxJS Observable |
| --- | --- | --- |
| 값 개수 | 1개 | 0..N 개 |
| 시작 | 생성 즉시 | 구독 시 |
| 취소 | 없음 | `unsubscribe()` |
| 합성 | `then` / `Promise.all` | 풍부한 operator (`map`, `tap`, `switchMap`...) |

NestJS Interceptor 는 RxJS Observable 위에서 동작 (`tap()` 으로 응답 후 처리). 컨트롤러/UseCase 는 Promise 로 충분. 자세히는 [[../nestjs/interceptors]].

---

## 안티패턴

- `await` 누락 → 함수가 결과 받기 전에 빠져나감. `no-floating-promises` 규칙 켜두기
- 불필요한 직렬 `await` 반복 (`await a(); await b()`) — 독립이라면 `Promise.all` 로 병렬
- `try/catch` 로 모든 await 감싸기 — NestJS 에서는 ExceptionFilter 로 일괄 처리하는 게 보통. *그 자리에서 의미 있게 변환할 수 있는 예외*만 잡기
- `setTimeout` 으로 *동기처럼* 작성 — 비동기 흐름을 깨뜨림. `await new Promise(r => setTimeout(r, ms))` 로 await 가능한 형태로
- 생성자에서 async 호출 — 생성자는 동기. 비동기 초기화가 필요하면 정적 팩토리(`static async create()`) 또는 lifecycle hook(`onModuleInit`) 사용

## 공식 문서

- MDN — Promise: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- MDN — async function: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- TS — Async Functions: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-7.html#async-functions
