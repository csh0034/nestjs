# Modules (ESM / CommonJS)

JS/TS 의 **모듈** 은 NestJS 의 `@Module` 과 *다른 것*이다. 여기서는 **언어 수준 import/export** 를 다룬다. NestJS 모듈은 [[../nestjs/02-modules]] 참고.

## 두 가지 모듈 시스템

| 시스템 | 문법 | 위치 |
| --- | --- | --- |
| **CommonJS (CJS)** | `require()` / `module.exports` | Node.js 의 전통 |
| **ES Modules (ESM)** | `import` / `export` | 표준 (브라우저 + Node) |

TypeScript 는 항상 `import`/`export` 문법으로 작성하지만 **컴파일 결과**는 `tsconfig.json` 의 `module` 옵션이 결정:

```json
"module": "commonjs"   // 이 프로젝트. require/exports 로 트랜스파일
```

이 프로젝트는 CJS 출력이라 Node 가 따로 ESM 처리를 하지 않는다. *작성은 ESM 문법, 실행은 CJS*.

---

## export / import 패턴

### Named export (이 프로젝트 기본)

```ts
// user.repository.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository { ... }

// 사용처
import { USER_REPOSITORY, UserRepository } from './user.repository';
```

### Default export

```ts
// config.ts
export default { db: '...' };

// 사용처
import config from './config';
import myConfig from './config';   // 이름 마음대로 — 위험
```

이 프로젝트는 **default export 를 거의 안 쓴다**. 이유:
- 이름이 import 측에서 자유 → 일관성 잃기 쉬움
- 자동 import / refactor 도구가 named export 와 더 잘 어울림
- NestJS / TypeScript 커뮤니티 일반 권장

`mikro-orm.config.ts` 만 예외로 default export 사용 (MikroORM CLI 가 default 와 named export 모두 지원하지만, 공식 예제가 default 기준이라 그대로 따름).

### Re-export

```ts
// index.ts (barrel)
export { User } from './user.entity';
export { UserRepository, USER_REPOSITORY } from './user.repository';
```

*Barrel file* — 디렉터리 단위로 공개 API 를 모아주는 패턴. 이 프로젝트는 barrel 없이 직접 import — 트리 셰이킹/순환 import 위험 회피.

### Type-only import (TS 한정)

```ts
import type { UserRepository } from './user.repository';
```

- 런타임 코드에서 사라짐 — 순환 import 방지에 유용
- `verbatimModuleSyntax` 옵션이 켜져 있으면 *값* import 와 *타입* import 의 구분이 강제됨 (이 프로젝트는 비활성)

---

## 모듈 해석 (module resolution)

```json
// tsconfig.json
"paths": { "@/*": ["./src/*"] }
```

```ts
import { User } from '@/modules/user/domain/user.entity';   // 절대 경로 alias
import { User } from '../../user/domain/user.entity';        // 상대 경로
```

`paths` alias 는 **TS 컴파일러 + IDE 만** 인식. Node 런타임이 그걸 그대로 받으면 못 찾는다. 해결:
- `ts-node` / Nest 가 내부적으로 변환 (이 프로젝트의 dev 모드)
- 빌드 후엔 `tsc-alias` 같은 도구로 상대 경로로 치환하거나, `tsconfig-paths/register` 로 런타임 로더 패치

이 프로젝트는 alias `@/*` 를 정의만 해두고 실제 코드에선 상대 경로 위주.

---

## CommonJS 와 ESM 의 *충돌 지점*

1. **`require` 호출과 `import` 혼용 금지** — TS 코드에서는 `import` 만 쓰면 충분
2. **Default import 호환성**: CJS 모듈을 ESM 처럼 `import x from 'cjs-pkg'` 로 받을 때 형태가 다를 수 있음. `esModuleInterop: true` (이 프로젝트 활성) 가 어댑터 역할
3. **Top-level await**: ESM 만 지원. CJS 출력에선 `async function main(){...}` 후 호출하는 패턴 필요. 이 프로젝트의 `main.ts` 가 정확히 그 형태

---

## `import` 부수 효과 (side effect import)

```ts
import 'reflect-metadata';   // 값 가져오지 않고, 그냥 실행만
```

데코레이터 메타데이터 폴리필 같은 *전역에 영향 주는 모듈*은 이렇게 import. 진입점(`main.ts`) 최상단에 둔다.

---

## 자주 보는 함정

### 1. 순환 import

```ts
// a.ts
import { B } from './b';
export class A { b = new B(); }

// b.ts
import { A } from './a';
export class B { a?: A; }
```

JS 런타임은 *부분 초기화된 모듈*을 반환할 수 있어 한쪽이 `undefined` 가 되는 일이 흔하다. 해결:
- `import type` 으로 타입만 가져오기
- 의존 방향을 일방으로 정리 (이 프로젝트는 헥사고날 의존 방향으로 회피)
- NestJS DI 의 `forwardRef(() => XModule)`

### 2. `index.ts` (barrel) 과 순환

barrel file 은 *전체 디렉터리를 한 번에 로드* 시키므로 순환 노출 확률을 높인다. 토이/대형 프로젝트 모두 신중하게.

### 3. `.js` 확장자

**Node.js 의 ESM 로더**는 import 경로에 확장자(`.js`)를 요구한다(브라우저 ESM 은 URL 기반이라 별개 이슈). CJS 출력이면 확장자 없이도 OK. 이 프로젝트는 CJS → 확장자 생략 가능. `moduleResolution: nodenext` / `bundler` 같은 설정에서는 TS 가 요구 규칙을 달리 강제하므로 별도 참고.

---

## 안티패턴

- `export default` 남발 — 이름 강제 안 됨, 자동 import 약함. **named export 권장**
- 거대한 barrel `index.ts` — 순환 + 트리셰이킹 손해. 모듈 경계가 의미 있을 때만
- `import * as X from '...'` 로 전부 가져오기 — 사용 안 하는 심볼도 번들에 포함될 수 있음. 명시 import 권장
- 라이브러리 내부 경로 import (`import { x } from 'lib/dist/internal/...'`) — public API 만 의존. 내부 경로는 마이너 업데이트에 깨짐

## 공식 문서

- TS Modules: https://www.typescriptlang.org/docs/handbook/2/modules.html
- Module Resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- Node.js — CJS vs ESM: https://nodejs.org/api/packages.html
