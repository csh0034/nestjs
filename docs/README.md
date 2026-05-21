# Docs

Spring Boot Kotlin JPA 경험자가 NestJS + MikroORM 으로 옮길 때 알아야 할 핵심 개념을 주제별로 정리.

## TypeScript

| 문서 | 다루는 것 | Kotlin/Java 대응 |
| --- | --- | --- |
| [philosophy.md](./ts/philosophy.md) | **전체 개요** — superset, type erasure, structural typing, 컴파일 모델 | — |
| [type-system.md](./ts/type-system.md) | `interface` vs `type`, union, generic, utility type, narrowing | nominal typing + sealed class + smart cast |
| [null-and-undefined.md](./ts/null-and-undefined.md) | `null`/`undefined`, optional `?:`, `?.`/`??`, `!`, `strictNullChecks` | Kotlin nullable + `?.`/`?:`/`!!` |
| [classes.md](./ts/classes.md) | class, parameter property, abstract, accessor, `this` 함정 | Kotlin class + 생성자 프로퍼티 |
| [decorators.md](./ts/decorators.md) | legacy decorator + `reflect-metadata`, NestJS/MikroORM 동작 원리 | 어노테이션 + AOP |
| [modules.md](./ts/modules.md) | ESM/CJS, `import`/`export`, paths alias, 순환 import | (직접 대응 없음) |
| [async-and-promises.md](./ts/async-and-promises.md) | `Promise`, `async`/`await`, `Promise.all`/`allSettled`, floating promise | Kotlin Coroutine, `Deferred` |
| [tsconfig.md](./ts/tsconfig.md) | 이 프로젝트의 `tsconfig.json` 옵션 해설 | — |

## NestJS

| 문서 | 다루는 것 | Spring 대응 |
| --- | --- | --- |
| [philosophy.md](./nestjs/philosophy.md) | **전체 아키텍처 개요** — 정의, 구성 요소, Request Lifecycle, Platform/Transport Agnostic | — |
| [modules.md](./nestjs/modules.md) | `@Module`, imports/providers/exports/controllers | Spring 의 컴포넌트 스캔/`@Configuration` |
| [dependency-injection.md](./nestjs/dependency-injection.md) | `@Injectable`, custom providers, Symbol 토큰, Scope | Bean + 생성자 주입 + Qualifier + `@Scope` |
| [controllers.md](./nestjs/controllers.md) | `@Controller`, 라우팅, DTO 매핑 | `@RestController` |
| [pipes.md](./nestjs/pipes.md) | `ValidationPipe`, class-validator, ParseUUIDPipe | Bean Validation + `Converter` |
| [guards.md](./nestjs/guards.md) | `Guard`, `Reflector`, `@SetMetadata` | Spring Security `@PreAuthorize` |
| [interceptors.md](./nestjs/interceptors.md) | `NestInterceptor`, RxJS `tap` | AOP `@Around` |
| [exception-filters.md](./nestjs/exception-filters.md) | `@Catch`, HTTP 매핑 | `@ControllerAdvice` + `@ExceptionHandler` |

## MikroORM

| 문서 | 다루는 것 | JPA 대응 |
| --- | --- | --- |
| [philosophy.md](./mikro-orm/philosophy.md) | **전체 아키텍처 개요** — Data Mapper, Unit of Work, Identity Map, Driver, NestJS 부팅 시퀀스 | Hibernate 의 정신적 모델 |
| [entities.md](./mikro-orm/entities.md) | `@Entity`, `@PrimaryKey`, `@Property`, `@Enum` | JPA `@Entity` |
| [entity-manager.md](./mikro-orm/entity-manager.md) | `EntityManager`, Unit of Work, Identity Map, flush | JPA `EntityManager`, 1차 캐시, dirty checking |
| [repositories.md](./mikro-orm/repositories.md) | `EntityRepository`, 커스텀 구현 | Spring Data `Repository` |
| [relations.md](./mikro-orm/relations.md) | `@OneToMany`, `@ManyToOne`, `Collection`, cascade | JPA 관계 매핑 |
| [transactions.md](./mikro-orm/transactions.md) | `em.transactional()`, 자동 flush, 롤백 | `@Transactional` |
| [request-context.md](./mikro-orm/request-context.md) | 요청별 EM 격리, `@nestjs/mikro-orm` 자동화 | `OpenEntityManagerInViewInterceptor` |

## 공식 문서 (1차 출처)

- NestJS: https://docs.nestjs.com
- MikroORM: https://mikro-orm.io/docs
- MikroORM × NestJS: https://mikro-orm.io/docs/usage-with-nestjs
- class-validator: https://github.com/typestack/class-validator

이 디렉터리의 문서는 *학습 목적의 요약*입니다. 정확한 동작/옵션은 항상 공식 문서를 확인하세요.
