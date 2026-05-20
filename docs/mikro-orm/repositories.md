# Repositories

`EntityRepository<T>` 가 기본 제공. **Spring Data 와 큰 차이**: 메서드 이름 기반 자동 쿼리 생성이 없다. 모든 메서드를 명시 구현.

## 기본 사용

```ts
@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly repo: EntityRepository<User>) {}

  findActive() {
    return this.repo.find({ active: true });
  }
}
```

기본 메서드: `find`, `findOne`, `findOneOrFail`, `count`, `persist`, `persistAndFlush`, `remove`, `removeAndFlush`, `nativeUpdate`, `nativeDelete`, …

## 이 프로젝트의 패턴 — 포트/어댑터

직접 `EntityRepository<T>` 를 컨트롤러/유스케이스가 주입받으면 **MikroORM 에 강결합**된다. 어댑터를 교체하기 어렵고, 테스트도 어렵다. 그래서 *도메인 포트 인터페이스* + *Mikro 구현 어댑터* 로 나눈다.

`src/modules/user/domain/user.repository.ts`:
```ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
```

`src/modules/user/infrastructure/persistence/user.mikro-orm.repository.ts`:
```ts
@Injectable()
export class UserMikroOrmRepository implements UserRepository {
  constructor(private readonly em: EntityManager) {}

  async save(user: User): Promise<void> {
    await this.em.persistAndFlush(user);
  }
  findById(id: string) { return this.em.findOne(User, { id }); }
  findByEmail(email: string) { return this.em.findOne(User, { email }); }
}
```

모듈 바인딩:
```ts
{ provide: USER_REPOSITORY, useClass: UserMikroOrmRepository }
```

UseCase 는 `@Inject(USER_REPOSITORY) users: UserRepository` 로 받는다. 테스트에서 in-memory mock 으로 교체 가능 (이 프로젝트의 `create-user.use-case.spec.ts`).

## EntityRepository 커스텀하기 (대안 패턴)

`getRepository()` 가 반환할 클래스를 직접 만들 수도 있다:

```ts
@Entity({ repository: () => UserRepository })
export class User { ... }

export class UserRepository extends EntityRepository<User> {
  findActive() { return this.find({ active: true }); }
}
```

`@nestjs/mikro-orm` 의 `@InjectRepository(User)` 가 이 커스텀 repository 를 주입. **편하지만 ORM 에 강결합**이라 클린 아키텍처에선 잘 안 쓴다. CRUD 위주 작은 모듈엔 충분.

## QueryBuilder (필요 시)

복잡한 SQL 은 `em.createQueryBuilder()` 로:

```ts
const qb = em.createQueryBuilder(Order, 'o');
qb.select('o.*').leftJoin('o.items', 'i').where({ 'i.productId': pid });
const orders = await qb.getResultList();
```

Spring Data 의 `@Query`/Querydsl 대응. *Repository 어댑터 내부*에서만 사용해 도메인이 보지 않게 한다.

## 안티패턴

- 컨트롤러나 도메인 entity 가 `EntityRepository<T>` 를 직접 의존 → 클린 아키텍처 위반
- 포트 인터페이스에 `Promise<EntityRepository<User>>` 같은 ORM 타입 노출 → 추상화 누수
- repository 메서드에 비즈니스 규칙 넣기 (`save()` 안에서 이메일 중복 체크) → UseCase 책임
- 메서드 이름으로 동작을 추측하는 *Spring Data 기대치* → MikroORM 은 자동 생성 없음

## 공식 문서

- https://mikro-orm.io/docs/repositories
- https://mikro-orm.io/docs/query-builder
