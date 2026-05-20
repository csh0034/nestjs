# Transactions

JPA `@Transactional` 의 대응. MikroORM 은 **자동 트랜잭션**(요청 단위)과 **명시적 트랜잭션**(`em.transactional`) 둘 다 지원.

## em.transactional() — 권장 패턴

```ts
await em.transactional(async () => {
  user.email = 'new@x.com';
  em.persist(newUser);
  // 블록 종료 시 자동 flush + commit
  // 예외 → rollback
});
```

이 프로젝트의 `place-order.use-case.ts`:

```ts
async execute(input: PlaceOrderCommand): Promise<Order> {
  return this.em.transactional(async () => {
    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundDomainException(`user not found`);

    for (const line of input.items) {
      const product = ...;
      product.decreaseStock(line.quantity);   // 변경 추적됨
    }
    const order = Order.place({ userId: user.id, items: orderItems });
    await this.orders.save(order);
    return order;
  });
}
```

핵심:
- 콜백 안에서 일어난 모든 변경은 **하나의 트랜잭션**
- 콜백이 정상 종료 → `flush()` 후 `commit`
- 예외 throw → `rollback`
- **트랜잭션 안에서는 같은 EM** (`this.em`) 을 그대로 쓴다 — fork 되지 않음

## JPA 와의 비교

| JPA | MikroORM |
| --- | --- |
| `@Transactional` 어노테이션 + AOP | `em.transactional(() => ...)` 명시 호출 |
| 트랜잭션 *전파* (`REQUIRED`, `REQUIRES_NEW`) | `em.transactional({ ctx, ... })` 으로 nested 가능 |
| `@Transactional(readOnly = true)` | `em.fork({ readOnly: true })` 또는 readonly 별도 처리 |
| rollback rules (예외 클래스 지정) | 모든 throw 가 rollback (커스텀하면 try/catch) |

NestJS 에서 *어노테이션 기반* 트랜잭션을 원한다면 `@nestjs/mikro-orm` 의 `@CreateRequestContext()` + 트랜잭션 데코레이터 라이브러리 조합도 있으나, 명시 호출이 *제어 흐름이 보여서* 추천.

## Nested Transaction

```ts
await em.transactional(async () => {
  await em.transactional(async () => { /* SAVEPOINT */ });
});
```

내부는 SAVEPOINT 로 처리. 다만 토이 수준에선 거의 안 씀.

## RequestContext 자동 트랜잭션

`MikroOrmModule.forRoot({ allowGlobalContext: false })` + `MikroOrmMiddleware` 가 요청별 EM 을 만들고, *요청 끝나면 자동 flush 하는 설정도 있다* (`autoLoadEntities`, `flush: 'always'` 같은 옵션은 버전에 따라 다름).

이 프로젝트는 명시 `em.transactional()` + repository 의 `persistAndFlush` 를 섞어 쓴다. 자동 flush 에 의존하지 않는 편이 디버깅에 좋다.

## Read-only 최적화

JPA 의 `@Transactional(readOnly = true)` 처럼 *변경 추적 비활성*은 MikroORM 도 가능:

```ts
const em = this.em.fork({ readOnly: true });
const users = await em.find(User, {});   // dirty checking 없음
```

조회 전용 유스케이스에서 성능 도움.

## 안티패턴

- 트랜잭션 콜백 안에서 *외부 시스템 호출*(HTTP API, 메일 발송) → 트랜잭션이 길어지고 DB 락 보유. 트랜잭션 밖으로 빼거나 outbox 패턴
- 트랜잭션 중간에 `em.clear()` → IdentityMap 비워져서 추적 끊김
- `em.transactional` 안에서 *다른 EM 인스턴스* 사용 → 격리 깨짐. 항상 콜백 인자의 em 또는 외부 em
- 도메인 이벤트 발행을 트랜잭션 *밖*에서 → commit 안 된 상태가 외부로 새어나갈 위험. 트랜잭션 내부에서 모았다가 commit 직후 발행이 안전 (이 프로젝트는 트랜잭션 안에서 발행 — 트레이드오프 존재)

## 공식 문서

- https://mikro-orm.io/docs/transactions
- https://mikro-orm.io/docs/usage-with-nestjs#request-scoped-handlers-in-queues
