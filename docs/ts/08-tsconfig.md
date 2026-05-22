# tsconfig.json — 이 프로젝트 옵션 해설

`tsc` 의 동작을 결정하는 설정. 이 프로젝트의 `tsconfig.json` 의 옵션을 *왜 이걸 켰는지* 관점으로 정리.

## 전체 옵션

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "./dist",

    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,

    "declaration": true,
    "removeComments": true,
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["jest", "node"],

    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "test/**/*", "mikro-orm.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 그룹별 의미

### 출력 형태

| 옵션 | 값 | 의미 |
| --- | --- | --- |
| `module` | `commonjs` | `import` 문을 CJS `require` 로 변환. Node + NestJS 표준 |
| `target` | `ES2022` | 출력 JS 의 문법 수준. Node 16.11+ 부터 대체로 지원. 단 `target: ES2022` 부터 `useDefineForClassFields` 가 기본 `true` 로 바뀐다는 점을 같이 인지할 것 — MikroORM/데코레이터 패턴과 상호작용 함정이 있다 ([[04-classes]] 참고) |
| `outDir` | `./dist` | 빌드 산출물 위치 |
| `declaration` | `true` | `.d.ts` 도 생성. 라이브러리 배포할 때 의미 있음 |
| `removeComments` | `true` | 산출물에서 주석 제거 |
| `sourceMap` | `true` | `.js.map` 생성. 디버거가 TS 줄로 매핑 |
| `incremental` | `true` | 빌드 캐시 사용. 변경된 파일만 재컴파일 |

### NestJS / MikroORM 필수

| 옵션 | 의미 |
| --- | --- |
| `experimentalDecorators` | legacy 데코레이터 활성. **없으면 NestJS/MikroORM 동작 안 함** |
| `emitDecoratorMetadata` | 데코레이터 붙은 클래스에 `design:type`/`design:paramtypes` 자동 주입. DI 가 동작하는 근거 |

자세히는 [[07-decorators]] 참고.

### 엄격성 (절대 끄지 말 것)

`strict: true` 는 strict 패밀리 **전체**를 켜는 마스터 스위치. 현재 TS 가 묶어주는 항목은 다음 9개:

| 옵션 | 의미 |
| --- | --- |
| `noImplicitAny` | 타입 추론 실패 시 `any` 가 아니라 에러 |
| `strictNullChecks` | `null`/`undefined` 를 별도 타입으로 추적 |
| `strictFunctionTypes` | 함수 파라미터에 *반공변* 검사 적용 (콜백 시그니처 안전성) |
| `strictBindCallApply` | `fn.bind/call/apply` 의 인자 타입을 검사 |
| `strictPropertyInitialization` | 클래스 필드가 생성자에서 반드시 초기화되어야 함. MikroORM `id!: string` 의 `!` 가 이것 때문 |
| `strictBuiltinIteratorReturn` | 내장 iterator 의 `return` 타입을 정확히 추적 (TS 5.6+) |
| `noImplicitThis` | `this` 의 타입을 추론 못 하면 에러 |
| `alwaysStrict` | 출력 JS 에 `"use strict"` 자동 삽입 |
| `useUnknownInCatchVariables` | `catch (e)` 의 `e` 타입을 `any` → `unknown` |

이 프로젝트의 `tsconfig.json` 에는 `strict: true` 한 줄로 위 전부가 켜지지만, `strictNullChecks` / `noImplicitAny` / `strictBindCallApply` 를 *명시적으로 반복*해 의도를 강조한 것. 그 외 `strict-*` 옵션도 모두 활성 상태다.

이와 별개로 *strict 패밀리가 아닌* 안전 옵션들도 함께 사용:

| 옵션 | 의미 |
| --- | --- |
| `noFallthroughCasesInSwitch` | switch 의 `case` 에서 `break` 누락 잡음 |
| `forceConsistentCasingInFileNames` | macOS / Windows 의 *대소문자 비구별 파일 시스템* 함정 방지 |

출처: https://www.typescriptlang.org/tsconfig#strict

### 모듈 호환성

| 옵션 | 의미 |
| --- | --- |
| `esModuleInterop` | CJS 모듈을 `import x from 'cjs-pkg'` 로 쓸 수 있게 어댑터 삽입 |
| `allowSyntheticDefaultImports` | 타입 체크 측에서 default import 허용 (esModuleInterop 의 짝) |
| `resolveJsonModule` | `import json from './x.json'` 가능 |

### 환경

| 옵션 | 의미 |
| --- | --- |
| `types` | `@types/jest`, `@types/node` 만 글로벌로 로드. *예상 못한 글로벌 오염* 방지 |
| `skipLibCheck` | `node_modules` 안 `.d.ts` 타입 체크는 건너뜀. 빌드 속도 큼 |
| `paths` | `@/*` → `src/*` alias. 런타임 변환은 별도 (ts-node / nest dev 가 처리) |

---

## `tsconfig.build.json` (별도 파일)

이 프로젝트엔 `tsconfig.build.json` 도 있다. 보통 `extends: "./tsconfig.json"` + `exclude` 만 다르게:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

→ `nest build` 시 테스트 파일을 산출물에 포함하지 않으려는 목적.

---

## strict 옵션을 끄고 싶어지는 순간들 (그래도 끄지 마라)

- **외부 라이브러리 타입이 엉성하다** → `skipLibCheck` 가 이미 켜져 있고, 정 필요하면 `// @ts-expect-error` 로 *국소* 우회. 전역으로 `strict` 끄지 말 것
- **레거시 JS 를 점진 도입** → 파일별 `// @ts-nocheck` 또는 `allowJs` 로 한정. strict 는 살려두기
- **MikroORM 엔티티 필드의 `!` 가 늘어난다** → 그게 정상. *definite assignment assertion* 은 ORM hydration 패턴에 따라 붙는 비용 ([[04-classes]] 참고)

`strict` 를 끄면 *런타임 버그를 컴파일러가 안 잡아주는 코드*가 되살아난다. Spring 에서 `@NonNull` 검증을 끄는 것과 같은 수준의 결정.

---

## 옵션을 추가로 고려해볼 수 있는 것

이 프로젝트에는 아직 안 켜져있지만 *언젠가* 고려할 만한 것:

| 옵션 | 효과 |
| --- | --- |
| `exactOptionalPropertyTypes` | `email?: string` 과 `email: string \| undefined` 를 엄격히 구분 |
| `noUncheckedIndexedAccess` | `arr[i]` 의 결과를 항상 `T \| undefined` 로 처리. 좋은 안전망이지만 코드량 증가 |
| `noImplicitOverride` | `override` 키워드 누락 시 에러. 상속 의도 명시 |
| `verbatimModuleSyntax` | `import` 가 값/타입 어느 쪽인지 모호하면 에러. ESM 전환에 도움 |

켜는 순간 *기존 코드의 다수 위치를 고쳐야* 함. 새 모듈부터 점진적으로 도입하는 것이 현실적.

---

## 공식 문서

- TS — Compiler Options: https://www.typescriptlang.org/tsconfig
- NestJS — TypeScript Quirks: https://docs.nestjs.com/recipes/swc#typescript-quirks
