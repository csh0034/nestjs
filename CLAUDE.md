# CLAUDE.md

NestJS + MikroORM 토이 프로젝트. Spring Boot Kotlin JPA 경험자가 NestJS 개념을 익히기 위해 DDD + Clean(Hexagonal) Architecture 로 작성.

## 아키텍처 규칙

4계층 (모듈 안에서 동일 구조 반복):

```
src/modules/<aggregate>/
├── domain/            # Entity, ValueObject, Repository 포트, DomainEvent
├── application/       # UseCase(Command/Query), DTO(Command), Event handler
├── infrastructure/    # MikroORM Repository 어댑터(포트 구현)
└── presentation/      # Controller, Request DTO (class-validator)
```

의존 방향: **presentation → application → domain ← infrastructure**

- `domain`: NestJS/MikroORM 외 모든 프레임워크 의존성 금지. 단, MikroORM 데코레이터는 entity 정의 편의상 함께 둠(JPA entity가 JPA 어노테이션 갖는 것과 동일).
- `application`: domain + 포트(repository 인터페이스)만 의존. ORM/HTTP 모름.
- `infrastructure`: domain의 포트를 구현. EntityManager 직접 사용 가능.
- `presentation`: application 호출 + DTO 변환. **컨트롤러에 도메인 객체 그대로 반환 금지** (View 객체로 매핑).

포트-어댑터 바인딩은 모듈에서:

```ts
providers: [
  { provide: USER_REPOSITORY, useClass: UserMikroOrmRepository },
],
exports: [USER_REPOSITORY],
```

## JPA ↔ NestJS+MikroORM 매핑

| Spring/JPA | NestJS/MikroORM | 비고 |
| --- | --- | --- |
| `@Component`/`@Service` + 생성자 주입 | `@Injectable()` + Nest IoC | DI 거의 동일 |
| Spring Data `@Repository` | `EntityRepository<T>` | 메서드 생성기 없음. 명시 구현 |
| `EntityManager` | `EntityManager` (MikroORM) | UoW · IdentityMap 동일 |
| `@Transactional` | `em.transactional(() => ...)` | 요청 컨텍스트 필수. `MikroOrmModule.forRoot()`가 자동 등록 |
| AOP `@Around` | `Interceptor` (RxJS) | `tap`으로 응답 후 처리 |
| `@PreAuthorize` | `Guard` + `Reflector` | 메타데이터 기반 |
| Bean Validation + Converter | `Pipe` (`ValidationPipe`) | class-validator/class-transformer |
| `@ConfigurationProperties` | `@nestjs/config` | env |
| Spring Events | `@nestjs/event-emitter` | 동기 기본 |

## 인터페이스 토큰 주입 (TS 한정 이슈)

TypeScript 인터페이스는 런타임에 사라지므로 `Symbol` 토큰을 사용:

```ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
// 사용처
constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
```

## 명령어

```bash
pnpm install
pnpm start:dev          # 개발 (watch)
pnpm test               # 단위 테스트 (Jest)
pnpm test:cov           # 커버리지
pnpm test:e2e           # e2e (별도 DB: nestjs_toy_test)
pnpm lint               # ESLint
pnpm build              # nest build
pnpm mikro-orm <cmd>    # MikroORM CLI (migration:create, migration:up 등)
```

## 환경

- 개발: `.env` → `DB_NAME=nestjs_toy`
- 테스트: `.env.test` → `DB_NAME=nestjs_toy_test` (e2e 실행 시 매번 스키마 refresh)
- 로컬 MariaDB(127.0.0.1:3306, root/111111)에서 두 DB 미리 생성 필요:
  - 만약 미생성이라면 e2e의 `refreshDatabase()` 가 자동 생성 시도

## 새 도메인 모듈 추가 체크리스트

1. `src/modules/<name>/{domain,application,infrastructure,presentation}/` 4 디렉터리 생성
2. `domain/<name>.entity.ts` — MikroORM `@Entity()` + AggregateRoot 상속, 정적 팩토리 메서드(`static create(...)`)로 불변식 강제
3. `domain/<name>.repository.ts` — `Symbol` 토큰 + 인터페이스 export
4. `infrastructure/persistence/<name>.mikro-orm.repository.ts` — 인터페이스 구현
5. `application/commands/*.use-case.ts`, `application/queries/*.use-case.ts` — `@Injectable()` UseCase
6. `presentation/<name>.controller.ts`, `presentation/dto/*.request.ts` — class-validator
7. `<name>.module.ts` — providers에 포트 바인딩, controllers, MikroOrmModule.forFeature, exports
8. `src/app.module.ts` 의 `imports` 에 추가

## 안티패턴 (하지 말 것)

- 컨트롤러에서 `EntityManager` / Repository 직접 호출 → 항상 UseCase 경유
- domain 레이어에 `@Injectable()` / `@nestjs/common` import → 프레임워크 침범
- repository 인터페이스 생략하고 컨크리트 클래스만 주입 → 어댑터 교체/테스트 어려움
- entity field initializer (예: `_events: Event[] = []`) 의존 → MikroORM hydration 시 실행 안 됨. lazy init 또는 `?:` 사용
- 도메인 객체를 컨트롤러에서 그대로 반환 → 영속성 필드/순환참조 노출. View DTO로 변환
- 일회성 작업에 `Scope.REQUEST` 남발 → 성능/DI 그래프 복잡도 ↑

## 테스트 노트

- 단위 테스트는 MikroORM Collection 사용 entity 때문에 metadata 가 필요 → `test/jest-orm-setup.ts` 가 `connect: false` 로 MikroORM 1회 init (jest.config의 `setupFilesAfterEnv` 등록)
- e2e 테스트는 매 실행 시 `orm.getSchemaGenerator().refreshDatabase()` 로 클린 → `nestjs_toy_test` DB 내용 모두 삭제됨
- Guard 단위 테스트는 `ExecutionContext` 를 mock 객체로 구성

## 폴더 한눈에

```
src/
├── main.ts                   # 전역 Pipe/Interceptor/Guard/Filter 바인딩
├── app.module.ts             # MikroOrmModule.forRootAsync + 도메인 모듈 합성
├── shared/
│   ├── domain/               # AggregateRoot, ValueObject, Money, DomainException
│   ├── application/use-case.ts
│   └── infrastructure/
│       ├── interceptors/logging.interceptor.ts
│       ├── guards/roles.guard.ts + roles.decorator.ts
│       └── filters/domain-exception.filter.ts
└── modules/
    ├── user/
    ├── product/
    └── order/                # OrderItem(Entity), 도메인 이벤트, 트랜잭션 유스케이스
```

## 외부 문서

- NestJS: https://docs.nestjs.com
- MikroORM Defining Entities: https://mikro-orm.io/docs/defining-entities
- MikroORM + NestJS: https://mikro-orm.io/docs/usage-with-nestjs
- class-validator: https://github.com/typestack/class-validator
