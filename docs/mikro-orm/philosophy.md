# MikroORM 아키텍처 개요

MikroORM 공식 문서(mikro-orm.io)에 명시된 정의·구성 요소·동작 모델을 JPA/Hibernate 경험자 관점에서 정리.

## 정의

> TypeScript ORM for Node.js based on Data Mapper, Unit of Work and Identity Map patterns. — *mikro-orm.io*

핵심:
- **Data Mapper** 패턴 — 엔티티는 *순수 객체*, 영속화 책임은 `EntityManager` 에 위임 (Active Record 와 반대)
- **Unit of Work** — 변경된 객체를 한 번에 묶어 SQL 발행
- **Identity Map** — 같은 PK 의 엔티티는 EM 안에서 *동일 인스턴스* 보장
- **TypeScript 일급** — 데코레이터 + reflect-metadata 로 스키마 표현. JS 도 가능
- **드라이버 추상** — MySQL/MariaDB, PostgreSQL, SQLite, MS SQL, **MongoDB** 까지 같은 API

→ 의도와 동작 모델이 **Hibernate / JPA 와 거의 같다**. Node 생태계의 ORM 중에서 *Hibernate 의 정신적 모델*에 가장 가까운 라이브러리.

출처: https://mikro-orm.io/, https://mikro-orm.io/docs/installation

---

## Node 진영의 다른 ORM 과의 차이

JPA 경험자가 가장 자주 혼동하는 부분.

| ORM | 패턴 | 1차 캐시 (IdentityMap) | Unit of Work | 비고 |
| --- | --- | --- | --- | --- |
| **MikroORM** | Data Mapper | ✅ | ✅ (auto-flush) | Hibernate 와 가장 닮음 |
| **TypeORM** | Active Record + Data Mapper (선택) | ❌ (없음) | △ (제한적) | 메서드 이름·동작은 비슷해 보이지만 *상태 추적이 없음* |
| **Prisma** | Query Builder | ❌ | ❌ | 엔티티 객체가 아니라 *plain object* 반환. 변경 감지 없음 |
| **Sequelize** | Active Record | △ | ❌ | 모델 인스턴스 자체에 save/update 메서드 |

→ "엔티티 필드를 바꾸면 flush 시 UPDATE 가 나간다" 는 JPA 의 *기본 가정*이 Node 진영에서는 **MikroORM 만 갖는다**. Prisma 에서 그렇게 코드를 짜면 *조용히* 아무 일도 안 일어난다.

---

## 구성 요소 (Building Blocks)

| 요소 | 역할 | JPA 대응 |
| --- | --- | --- |
| **MikroORM** | ORM 인스턴스. config 와 metadata 보유 | `EntityManagerFactory` |
| **EntityManager** | 트랜잭션/IdentityMap/UoW 의 컨텍스트 | `EntityManager` |
| **EntityRepository<T>** | 엔티티별 보조 API | `Repository<T>` |
| **MetadataStorage** | 데코레이터로 수집된 엔티티 메타데이터 | JPA `Metamodel` |
| **Driver** | DB 방언/연결 풀/SQL 생성 | Hibernate Dialect |
| **SchemaGenerator** | 엔티티 → DDL (`schema:create`, `schema:update`, `refreshDatabase`) | `hbm2ddl` |
| **Migrator** | 마이그레이션 파일 관리 (`migration:create/up/down`) | Flyway/Liquibase (외부) |
| **Seeder** | 초기 데이터 적재 | (직접 구현) |
| **EntityGenerator** | 기존 DB → 엔티티 생성 (역공학) | Hibernate Tools |

이 프로젝트의 `mikro-orm.config.ts` 가 `Migrator` 를 `extensions` 로 등록한 이유는 *마이그레이션 CLI 활성화* 때문.

출처: https://mikro-orm.io/docs/installation

---

## 핵심 동작: Unit of Work 사이클

요청 1건이 처리되는 동안의 흐름.

```
요청 시작
    ↓
RequestContext.create(em, ...) — 요청 전용 EM (fork)
    ↓
em.find / em.findOne                   ← Identity Map 에 등록
    ↓
entity.someField = ... / domain method ← 변경 추적 (Dirty Checking)
    ↓
em.persist(newEntity)                  ← 신규 객체 등록
    ↓
em.flush() (또는 em.transactional() 종료)
    ├─ Identity Map dirty 객체 → UPDATE
    ├─ persist 신규 객체 → INSERT
    └─ remove 객체 → DELETE
    ↓
응답 반환 → RequestContext 해제
```

JPA `EntityManager` 의 1차 캐시 + dirty checking + `flush()` 사이클이 그대로 옮겨왔다고 보면 된다.

자세히는 [entity-manager.md](./entity-manager.md) 참고.

출처: https://mikro-orm.io/docs/unit-of-work, https://mikro-orm.io/docs/identity-map

---

## RequestContext — AsyncLocalStorage 기반 요청 격리

JPA + Spring 에서는 *컨테이너가 알아서* 요청별 EM 을 묶지만, MikroORM 은 **명시적**으로 컨텍스트를 열어야 한다.

- 각 요청은 `em.fork()` 로 **별도 IdentityMap/UoW** 를 가진 EM 인스턴스 사용
- Node 의 `AsyncLocalStorage` 로 비동기 호출 체인 전반에 EM 을 전파
- `@nestjs/mikro-orm` 의 미들웨어가 *HTTP 요청마다 자동*으로 `RequestContext.create()` 호출
- 스케줄러/큐 등 HTTP 가 아닌 곳은 `@CreateRequestContext()` 데코레이터로 직접 명시

이 설계를 안 지키면 *전역 EM 공유* → 요청 간 데이터 누수 + 메모리 증가. `allowGlobalContext: false` (이 프로젝트 기본) 로 잘못 사용 자체를 막을 수 있다.

자세히는 [request-context.md](./request-context.md) 참고.

출처: https://mikro-orm.io/docs/identity-map#request-context, https://mikro-orm.io/docs/async-local-storage

---

## Data Mapper vs Active Record

```ts
// ✅ MikroORM (Data Mapper)
user.email = 'new@x.com';
await em.flush();           // EM 이 SQL 발행 책임

// ❌ Active Record (Sequelize/TypeORM AR 모드 — MikroORM 은 이런 형태 없음)
user.email = 'new@x.com';
await user.save();
```

엔티티 자체에는 `save()`/`delete()` 같은 영속화 메서드가 **없다**. 도메인 로직과 영속화가 깔끔히 분리되므로 DDD/Clean Architecture 와 잘 맞는다 — 이 프로젝트가 채택한 이유.

출처: https://martinfowler.com/eaaCatalog/dataMapper.html

---

## 데코레이터 + Reflect Metadata

NestJS 와 같은 메커니즘. `experimentalDecorators: true` + `emitDecoratorMetadata: true` 위에서 동작.

```ts
@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'uuid' }) id!: string;
  @Property({ unique: true }) email!: string;
  @OneToMany(() => Order, o => o.user) orders = new Collection<Order>(this);
}
```

- 클래스/프로퍼티 데코레이터로 *스키마 메타데이터*를 수집
- `MetadataStorage` 가 부팅 시 모든 엔티티를 스캔/검증
- 런타임에 `em.find(User, ...)` 호출 시 그 메타데이터로 SQL 생성

TS 데코레이터 일반론은 [[../ts/07-decorators]] 참고.

출처: https://mikro-orm.io/docs/defining-entities, https://mikro-orm.io/docs/metadata-providers

---

## Driver — DB 추상

같은 엔티티 코드가 여러 DB 위에서 동작:

| 드라이버 패키지 | DB |
| --- | --- |
| `@mikro-orm/mariadb` | MariaDB (이 프로젝트) |
| `@mikro-orm/mysql` | MySQL |
| `@mikro-orm/postgresql` | PostgreSQL |
| `@mikro-orm/sqlite` / `better-sqlite` | SQLite |
| `@mikro-orm/mssql` | MS SQL Server |
| `@mikro-orm/mongodb` | **MongoDB** (스키마/관계 모델 유지) |

이 프로젝트의 `mikro-orm.config.ts` 는 `defineConfig` 를 `@mikro-orm/mariadb` 에서 import — 그 차이만으로 다른 DB 로 교체 가능.

출처: https://mikro-orm.io/docs/usage-with-mysql, https://mikro-orm.io/docs/usage-with-mongo

---

## SchemaGenerator & Migrator

| 도구 | 용도 | 비고 |
| --- | --- | --- |
| **SchemaGenerator** | 엔티티 메타데이터 → DDL 직접 실행 | `orm.schema.refreshDatabase()` (이 프로젝트 e2e 가 사용) |
| **Migrator** | 변경분을 마이그레이션 파일로 생성/적용 | `pnpm mikro-orm migration:create` / `migration:up` |

SchemaGenerator 는 **개발/테스트용**, Migrator 는 **운영용**. 운영 DB 에 `schema:update` 직행은 절대 금지 — 데이터 손실 가능.

출처: https://mikro-orm.io/docs/schema-generator, https://mikro-orm.io/docs/migrations

---

## 부팅 시퀀스 (NestJS 연동 기준)

```
NestFactory.create(AppModule)
    ↓
MikroOrmModule.forRootAsync({ useFactory: ... })
    ├─ MikroORM.init({ ... })
    │     ├─ 엔티티 파일 스캔 (`entities`, `entitiesTs`)
    │     ├─ MetadataStorage 구축
    │     ├─ Driver 연결 풀 생성
    │     └─ 옵션 검증
    ├─ MikroOrmMiddleware 등록 → 요청마다 RequestContext.create
    └─ EntityManager / MikroORM / EntityRepository 를 DI 컨테이너에 provider 로 등록
    ↓
애플리케이션 listen
```

출처: https://mikro-orm.io/docs/usage-with-nestjs

---

## Hibernate / JPA 와의 정신적 대응

| Hibernate / JPA | MikroORM |
| --- | --- |
| `EntityManagerFactory` | `MikroORM` 인스턴스 |
| `EntityManager` | `EntityManager` |
| persistence context (1차 캐시) | Identity Map |
| dirty checking + flush | Unit of Work + `em.flush()` |
| `@Entity`, `@Column`, `@OneToMany` | `@Entity`, `@Property`, `@OneToMany` |
| `@Transactional` (Spring) | `@Transactional()` / `em.transactional()` |
| `OpenEntityManagerInViewInterceptor` | `RequestContext` + `@nestjs/mikro-orm` 미들웨어 |
| Dialect | Driver |
| `hbm2ddl=create-drop` | `SchemaGenerator.refreshDatabase()` |
| Flyway/Liquibase | `Migrator` (내장) |
| N+1 + `fetch=EAGER`/`LAZY` | `populate` 옵션 + `eager: true`/`Collection<T>` lazy |
| Spring Data `Repository` | `EntityRepository<T>` (메서드 자동 생성 ❌) |

**가장 큰 차이**: Spring Data 의 *메서드 이름 기반 쿼리 생성*이 없다. 모든 메서드를 명시 구현해야 한다. 자세히는 [repositories.md](./repositories.md) 참고.

---

## 함께 보기

- [entities.md](./entities.md) — `@Entity`, `@PrimaryKey`, hydration 함정
- [entity-manager.md](./entity-manager.md) — EM, IdentityMap, UoW 상세
- [repositories.md](./repositories.md) — EntityRepository, 포트/어댑터 패턴
- [relations.md](./relations.md) — `@OneToMany`, `Collection<T>`, populate
- [transactions.md](./transactions.md) — `em.transactional()`, `@Transactional()`
- [request-context.md](./request-context.md) — 요청 격리, `@CreateRequestContext`

## 공식 문서

- MikroORM Home: https://mikro-orm.io/
- Installation & Quick Start: https://mikro-orm.io/docs/installation
- Unit of Work: https://mikro-orm.io/docs/unit-of-work
- Identity Map: https://mikro-orm.io/docs/identity-map
- Usage with NestJS: https://mikro-orm.io/docs/usage-with-nestjs
