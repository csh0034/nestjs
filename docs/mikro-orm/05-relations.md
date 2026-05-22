# Relations

관계 매핑은 JPA 와 의도가 동일하지만, **`Collection<T>`** 추상이 더 들여다보인다.

## 카디널리티 대응 표

| JPA | MikroORM |
| --- | --- |
| `@ManyToOne` | `@ManyToOne(() => Other)` |
| `@OneToMany(mappedBy="parent")` | `@OneToMany(() => Other, o => o.parent)` |
| `@OneToOne` | `@OneToOne(() => Other)` |
| `@ManyToMany` | `@ManyToMany(() => Other)` |

이 프로젝트의 `Order` ↔ `OrderItem`:

```ts
// order.entity.ts
@OneToMany(() => OrderItem, (item) => item.order, {
  cascade: [Cascade.PERSIST, Cascade.REMOVE],
  eager: true,
  orphanRemoval: true,
})
items = new Collection<OrderItem>(this);

// order-item.entity.ts
@ManyToOne(() => Order)
order!: Rel<Order>;
```

## Collection<T> — 가장 큰 차이

JPA 는 `List<OrderItem>` 을 그대로 쓰지만 MikroORM 은 `Collection<OrderItem>` 이라는 *별도 타입*을 쓴다.

- `Collection` 은 lazy 로딩 상태(초기화 안 됨)와 로딩된 상태를 구분
- `items.add(...)`, `items.remove(...)`, `items.set([...])` 같은 메서드 제공
- 순회 전에 `await collection.init()` 또는 `populate: ['items']` 로 로딩 필요 (`eager: true` 면 자동)

```ts
const order = await em.findOne(Order, { id }, { populate: ['items'] });
for (const item of order.items.getItems()) { ... }
```

**도메인 단위 테스트의 함정**: Collection 의 `add()` 가 내부적으로 EntityMetadata 를 조회한다 → ORM 이 초기화되지 않은 환경에서는 실패. 이 프로젝트는 `test/jest-orm-setup.ts` 에서 `MikroORM.init({ connect: false })` 로 메타데이터만 로드하는 방식으로 우회.

## Cascade

```ts
{ cascade: [Cascade.PERSIST, Cascade.REMOVE] }
```

| MikroORM | JPA |
| --- | --- |
| `Cascade.PERSIST` | `CascadeType.PERSIST` |
| `Cascade.REMOVE` | `CascadeType.REMOVE` |
| `Cascade.ALL` | `CascadeType.ALL` |
| (대응 없음) | `CascadeType.MERGE`, `CascadeType.REFRESH`, `CascadeType.DETACH` |

MikroORM v6 `Cascade` enum 에는 `PERSIST` / `REMOVE` / `ALL` 만 있다. dirty checking 모델 자체가 JPA 의 `merge` 개념을 거의 쓰지 않으므로 대응이 비어있는 게 정상.

부모를 `persist` 하면 자식도 자동 INSERT. orphanRemoval 켜면 컬렉션에서 빠진 자식은 DELETE.

출처: https://mikro-orm.io/docs/cascading

## populate (N+1 회피)

```ts
em.findOne(Order, { id }, { populate: ['items', 'items.product'] });
```

깊은 경로도 점 표기로. 컬렉션 순회가 잦은 곳에서 `populate` 빠뜨리면 JPA 의 N+1 과 같은 증상.

## Rel<T> 유틸리티 타입

```ts
@ManyToOne(() => Order)
order!: Rel<Order>;
```

`Rel<T>` 의 본 목적은 MikroORM 의 **strict relation 타입**(`Reference<T>` 같은 wrapping)이 적용된 환경에서도 *바닐라 객체처럼* `order.id` 로 접근할 수 있게 호환 타입을 만들어 주는 것. 부수효과로 양방향 관계의 *타입 순환 import* 도 완화된다. 출처: https://mikro-orm.io/docs/type-safe-relations

## Owning vs Inverse Side

JPA 와 동일. `@ManyToOne` 쪽이 **owning**(FK 가짐), `@OneToMany` 쪽이 **inverse**(`mappedBy` 해당하는 `(o => o.parent)`). DB 변경은 owning side 가 반영한다.

## 안티패턴

- `Collection.add()` 안 하고 plain array 에 push → 영속화 안 됨. 항상 Collection API
- 모든 관계를 `eager: true` → 항상 join, 페이로드 비대해짐. 필요한 곳만
- 양방향 관계에서 owning side 만 변경 후 inverse side 도 같이 안 맞춰 둠 → 메모리 객체와 DB 가 잠시 어긋남. setter 에서 양쪽 동기화하거나 도메인 메서드로 캡슐화

## 공식 문서

- https://mikro-orm.io/docs/relationships
- https://mikro-orm.io/docs/collections
- https://mikro-orm.io/docs/loading-strategies
