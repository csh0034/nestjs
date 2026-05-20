# EntityManager · Unit of Work · Identity Map

MikroORM 이 **Hibernate 와 가장 닮은 부분**. JPA 의 `EntityManager`/1차 캐시/Dirty Checking 이 거의 그대로 있다.

## 핵심 동작 모델

1. `em.find()`/`em.findOne()` 등으로 가져온 객체는 **EM 의 Identity Map** 에 등록된다 — 같은 PK 로 다시 조회하면 동일 인스턴스
2. 그 객체의 필드를 변경하면 EM 이 **변경을 추적**한다 (Dirty Checking)
3. `em.flush()` 호출 시점에 모인 변경사항이 **한 번에** SQL 로 나간다 (Unit of Work)
4. 새 객체는 `em.persist(entity)` 로 EM 에 등록 → flush 시 INSERT

JPA 의 `EntityManager.persist/merge/flush` 와 거의 동일.

## 기본 API

```ts
const user = await em.findOne(User, { id });           // SELECT
user.name = '바뀐 이름';                                // 변경 추적
await em.flush();                                       // UPDATE 발행

const newUser = User.create({...});
em.persist(newUser);
await em.flush();                                       // INSERT

// 또는 합치기
await em.persistAndFlush(newUser);
```

이 프로젝트 `UserMikroOrmRepository`:

```ts
async save(user: User): Promise<void> {
  await this.em.persistAndFlush(user);
}
findById(id: string) { return this.em.findOne(User, { id }); }
```

## flush 가 왜 중요한가

flush 는 **세 가지를 트리거**한다:
1. Identity Map 의 dirty 객체 → UPDATE
2. `persist` 된 신규 객체 → INSERT
3. `remove` 된 객체 → DELETE

flush 가 호출되지 않으면 메모리에만 변경이 있고 DB 에는 반영 안 된다. 이게 *bug* 의 흔한 원인.

→ 그래서 **요청별 EM** + **자동 flush** 패턴이 필요. `request-context.md` 참고.

## Identity Map

같은 EM 안에서 같은 PK 를 두 번 조회하면 **DB 에 가지 않고** 같은 인스턴스를 돌려준다:

```ts
const a = await em.findOne(User, { id: 'x' });
const b = await em.findOne(User, { id: 'x' });
console.log(a === b); // true
```

JPA 1차 캐시와 같은 의도. 의도된 동작이지만 *테스트에서 stale 데이터로 보일 수* 있다 — `em.clear()` 또는 새 RequestContext 안에서 조회.

## populate (Lazy vs Eager)

MikroORM 은 기본적으로 관계가 **lazy** 다. 명시적 populate 필요:

```ts
const order = await em.findOne(Order, { id }, { populate: ['items'] });
```

또는 entity 정의에서 `@OneToMany(..., { eager: true })`. 이 프로젝트 Order 는 items 를 eager 로 잡았다(주문 조회는 항상 items 가 필요하기 때문).

→ JPA 의 N+1 함정이 그대로 적용된다. 컬렉션 순회를 자주 한다면 populate 명시.

## 명시적 트랜잭션과 EM

`em.transactional(async () => { ... })` 안에서는 **트랜잭션 종료 시 자동 flush + commit**. 예외 시 rollback. → `transactions.md` 참고.

## EntityManager 의 fork

요청 간 격리를 위해 `em.fork()` 로 *별도 EM* 을 만들 수 있다. `@nestjs/mikro-orm` 은 이걸 요청마다 자동으로 해준다.

```ts
const childEm = em.fork();
const user = await childEm.findOne(User, ...);   // 별도 IdentityMap
```

## 안티패턴

- **global EM 사용**: 여러 요청이 같은 IdentityMap 을 공유 → 데이터 누수. 항상 RequestContext 안에서 동작
- flush 누락: `em.persist()` 만 호출하고 끝 → INSERT 안 됨
- `em.flush()` 를 비즈니스 로직 중간중간 호출 → UoW 의 일관성 깨짐. 트랜잭션 단위로 한 번
- 동일 EM 안에서 entity 를 `new` 로 만들어 직접 변경 후 영속화 시도 → IdentityMap 에 없으니 `persist` 필요

## 공식 문서

- https://mikro-orm.io/docs/entity-manager
- https://mikro-orm.io/docs/unit-of-work
- https://mikro-orm.io/docs/identity-map
