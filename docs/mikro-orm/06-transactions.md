# Transactions

MikroORM 은 **명시적(programmatic) 방식**과 **선언적(declarative) 방식** 두 가지 트랜잭션 API 를 제공한다. 둘 다 코어(`@mikro-orm/core`) 에 포함 — 별도 라이브러리 불필요.

## 1) `em.transactional()` — 명시적 / 블록 단위

```ts
await em.transactional(async (em) => {
  user.email = 'new@x.com';
  em.persist(newUser);
  // 콜백 종료 시 자동 flush + commit, 예외 → rollback
});
```

- 콜백 인자로 *트랜잭션 컨텍스트에 묶인 em* 이 들어옴. 그 em 으로 작업
- 메서드 안의 *부분 블록*만 트랜잭션으로 묶고 싶을 때 적합

이 프로젝트의 `place-order.use-case.ts`:

```ts
async execute(input: PlaceOrderCommand): Promise<Order> {
  return this.em.transactional(async () => {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundDomainException('user not found');
    for (const line of input.items) {
      const product = ...;
      product.decreaseStock(line.quantity);   // 변경 추적
    }
    const order = Order.place({ userId: user.id, items: orderItems });
    await this.orders.save(order);
    return order;
  });
}
```

## 2) `@Transactional()` — 선언적 / 메서드 단위

`@mikro-orm/core` 가 제공하는 데코레이터. 메서드 전체를 트랜잭션으로 wrap.

```ts
import { EntityManager, Transactional, IsolationLevel } from '@mikro-orm/core';

export class MyService {
  constructor(private readonly em: EntityManager) {}

  @Transactional()
  async createUser(data: CreateUserDto) {
    const user = this.em.create(User, data);
    await this.em.persist(user).flush();
    return user;
  }

  @Transactional({ isolationLevel: IsolationLevel.SERIALIZABLE })
  async transferMoney(from: number, to: number, amount: number) { ... }
}
```

기본 동작:
- `em.transactional()` 의 모든 옵션을 받는다
- **default propagation = `REQUIRED`** — 호출 체인에 이미 트랜잭션이 있으면 합류, 없으면 새로 시작
- 예외 throw → rollback

출처: https://mikro-orm.io/docs/transactions, https://mikro-orm.io/docs/decorators

### 옵션

| 옵션 | 예 |
| --- | --- |
| `isolationLevel` | `IsolationLevel.READ_COMMITTED`/`READ_UNCOMMITTED`/`REPEATABLE_READ`/`SERIALIZABLE` |
| `propagation` | `TransactionPropagation.REQUIRED` (기본). 다른 옵션은 공식 docs 참고 |
| `readOnly` | `true` 면 변경 추적 비활성 |
| `ctx` | 외부에서 트랜잭션 컨텍스트를 직접 넘길 때 |

### REQUIRED propagation 예시 (공식)

```ts
class LibraryService {
  constructor(private readonly em: EntityManager) {}

  @Transactional()
  async createAuthorWithBook() {
    const author = new Author(...);
    this.em.persist(author);
    await this.addBook(author);   // 같은 트랜잭션에 합류
  }

  @Transactional({ propagation: TransactionPropagation.REQUIRED })
  async addBook(author: Author) {
    this.em.persist(book);
    throw new Error();             // 바깥까지 전부 rollback
  }
}
```

## 두 방식 선택 기준

| 상황 | 추천 |
| --- | --- |
| 메서드 전체가 하나의 트랜잭션 = 트랜잭션 경계와 *유스케이스 경계*가 같다 | `@Transactional()` |
| 메서드 일부 블록만 트랜잭션 / 동적 결정 / 컨텍스트 명시 전달 | `em.transactional()` |
| 외부 시스템 호출과 분리해 트랜잭션 길이를 짧게 가져가야 함 | `em.transactional()` (블록 단위로 좁히기) |

이 프로젝트는 *유스케이스 경계와 트랜잭션 경계가 일치하지만*, 의존성을 줄이고 흐름을 명시적으로 드러내는 `em.transactional()` 을 선택했다. `@Transactional()` 로 바꿔도 동일하게 동작한다 — 취향/팀 컨벤션 문제.

## JPA `@Transactional` 과의 비교

| 항목 | JPA `@Transactional` | MikroORM `@Transactional()` / `em.transactional()` |
| --- | --- | --- |
| 부착 위치 | 메서드/클래스 | 메서드 (`@Transactional()`) 또는 임의 블록 (`em.transactional()`) |
| 기본 propagation | `REQUIRED` | `REQUIRED` |
| isolation level | `@Transactional(isolation = ...)` | `{ isolationLevel: IsolationLevel.* }` |
| readOnly | `@Transactional(readOnly = true)` | `{ readOnly: true }` |
| rollback rules | 예외 클래스 지정 가능 | 모든 throw 가 rollback (커스텀하려면 try/catch) |
| 메커니즘 | Spring AOP 프록시 | 데코레이터가 메서드를 `em.transactional()` 호출로 wrap |

## Nested Transaction (SAVEPOINT)

```ts
await em.transactional(async () => {
  await em.transactional(async () => { /* SAVEPOINT */ });
});
```

`@Transactional()` 끼리 중첩되어도 REQUIRED 면 같은 트랜잭션에 합류. 진짜 새로운 중첩 트랜잭션이 필요하면 다른 propagation 옵션 사용 (공식 docs 확인 권장).

## 안티패턴

- 트랜잭션 콜백/메서드 안에서 *외부 시스템 호출* (HTTP, 메일) → 트랜잭션이 길어지고 DB 락 보유. 트랜잭션 밖으로 빼거나 outbox 패턴
- 트랜잭션 중간에 `em.clear()` → IdentityMap 비워져서 추적 끊김
- `em.transactional` 안에서 *다른 em 인스턴스* 사용 → 격리 깨짐. 콜백 인자의 em 사용
- 도메인 이벤트 발행을 commit 안 된 상태에서 외부로 보내기 → 일관성 깨질 위험. trade-off 인지하고 outbox 패턴 고려

## 공식 문서

- https://mikro-orm.io/docs/transactions
- https://mikro-orm.io/docs/decorators (`@Transactional`, `@CreateRequestContext`)
