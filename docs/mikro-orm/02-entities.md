# Entities

`@Entity()` 데코레이터로 클래스를 영속 객체로 표시. JPA `@Entity` 와 의도 동일.

## 기본

```ts
@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  name!: string;

  @Enum({ items: () => UserRole })
  role!: UserRole;

  @Property()
  createdAt: Date = new Date();
}
```

## 데코레이터 대응 표 (JPA → MikroORM)

| JPA | MikroORM |
| --- | --- |
| `@Entity` `@Table(name=...)` | `@Entity({ tableName: ... })` |
| `@Id` | `@PrimaryKey()` |
| `@GeneratedValue(IDENTITY)` | `@PrimaryKey({ autoincrement: true })` |
| `@Column` | `@Property()` |
| `@Column(nullable=false, unique=true)` | `@Property({ nullable: false, unique: true })` |
| `@Enumerated(EnumType.STRING)` | `@Enum({ items: () => MyEnum })` |
| `@Temporal` | `@Property({ type: 'date' })` |
| `@Transient` | `@Property({ persist: false })` |
| `@ManyToOne` | `@ManyToOne(() => Other)` |
| `@OneToMany(mappedBy=...)` | `@OneToMany(() => Other, o => o.parent)` |
| `@ManyToMany` | `@ManyToMany(...)` |

## ID 전략

이 프로젝트는 애플리케이션 측에서 UUID 를 생성한다(`crypto.randomUUID()` 도메인 팩토리에서). MikroORM 에 자동 생성 옵션이 있지만, **도메인이 객체 생성 시점에 식별자를 갖는** 모델이 깔끔하다.

```ts
static create(...): User {
  const user = new User();
  user.id = randomUUID();
  ...
  return user;
}
```

## Field Initializer 함정 (중요)

```ts
@Entity()
export class Foo {
  private _events: Event[] = [];   // ⚠️ 주의
}
```

공식 문서가 명시한다 — **"MikroORM does not call entity constructors on managed entities"**. 생성자가 호출되지 않으니 *클래스 field initializer 도 실행되지 않는다*. 이 프로젝트도 `AggregateRoot` 에서 이 문제를 겪어 lazy initialize 로 바꿨다:

```ts
export abstract class AggregateRoot {
  private _domainEvents?: DomainEvent[];   // optional + lazy init

  protected addEvent(e: DomainEvent) {
    if (!this._domainEvents) this._domainEvents = [];
    this._domainEvents.push(e);
  }
}
```

JPA 도 비슷한 함정이 있지만 (final field 초기화), MikroORM 은 *훨씬 자주* 만난다. TS `target: ES2022` 부터 `useDefineForClassFields` 가 기본 `true` 가 되어 필드가 `Object.defineProperty` 로 정의되는 점이 함정을 한 겹 더 얹는다 ([[../ts/04-classes]] 참고).

출처: https://mikro-orm.io/docs/entity-constructors

## 도메인 분리 vs 데코레이터 함께 두기

깊은 DDD 에서는 도메인 entity 와 ORM schema 를 분리한다(`EntitySchema` 사용). 하지만:
- 분리하면 매번 매핑 코드 추가
- 도메인 메서드(`order.cancel()`)와 영속 객체가 따로 살게 됨

이 프로젝트는 **JPA 와 같은 트레이드오프**(entity 에 어노테이션을 두는 절충)를 택했다. 도메인 규모가 커지면 분리 고려.

## 인스펙션 / 디버깅 팁

- `em.getMetadata().get(EntityName).properties` 로 매핑 확인
- `debug: true` 로 SQL 출력 (이 프로젝트의 `mikro-orm.config.ts` 에서 dev 환경 활성)

## 안티패턴

- 모든 `@Property()` 에 `{ nullable: true }` 디폴트화 → DB 제약이 사라짐. 명시적으로 NOT NULL 유지
- entity 안에 `@Inject()` / NestJS 데코레이터 → 도메인이 프레임워크에 침범당함
- `@Property({ persist: false })` 로 "거의 transient" 한 필드를 자주 만든다 → ValueObject 또는 별도 객체로 분리 신호

## 공식 문서

- https://mikro-orm.io/docs/defining-entities
- https://mikro-orm.io/docs/property-validation
