# Request Context

JPA + Spring 에서는 `OpenEntityManagerInView` / 요청 스코프 EM 이 자동으로 관리되지만, **MikroORM 은 명시적**으로 관리해야 한다. 그 핵심이 RequestContext.

## 왜 필요한가

`EntityManager` 는 **IdentityMap 과 UoW 를 가진 상태 객체**다. 여러 요청이 *전역으로 같은 EM* 을 공유하면:
- 요청 A 가 변경한 객체가 요청 B 에 보임
- IdentityMap 누수로 메모리 증가
- `em.flush()` 가 의도치 않은 요청에 동작

→ **요청마다 EM 을 fork** 해서 격리해야 한다.

`MikroOrmModule.forRoot({ allowGlobalContext: false })` 로 *전역 EM 사용 자체를 금지*하면 (이 프로젝트가 그렇다), 컨텍스트 밖에서 EM 사용 시 즉시 에러 → 실수 방지.

## @nestjs/mikro-orm 이 자동으로 해주는 것

이 모듈을 imports 에 넣으면:
1. NestJS 요청마다 미들웨어가 `RequestContext.create(em, next)` 호출
2. 그 안에서 주입된 EM 은 **AsyncLocalStorage** 로 요청별 격리
3. 요청 종료 시 컨텍스트 해제

→ 컨트롤러/UseCase 에서 `private em: EntityManager` 를 그냥 주입받아도 *그 요청의 EM* 이 들어온다. JPA + Spring 의 EM 주입 사용감과 거의 같아진다.

## 컨텍스트 밖 사용 — @CreateRequestContext()

HTTP 요청 아닌 곳에서 EM 을 써야 할 때 (스케줄러, 큐 컨슈머, 이벤트 핸들러 등):

```ts
import { CreateRequestContext, MikroORM } from '@mikro-orm/core';

@Injectable()
export class CleanupJob {
  constructor(private readonly orm: MikroORM) {}

  @Cron('0 * * * *')
  @CreateRequestContext()
  async run() {
    const em = this.orm.em;
    await em.nativeDelete(Session, { expiredAt: { $lt: new Date() } });
  }
}
```

데코레이터가 새 RequestContext 를 열고 메서드 종료 시 닫는다. JPA 에서 `@Async` 메서드에 `@Transactional` 다는 것과 비슷한 위치.

이전 이름은 `@UseRequestContext()` 였다 (MikroORM 5). v6 부터는 `@CreateRequestContext()`. 오래된 블로그 글 보면 이전 이름이 등장.

## 직접 호출 형태

데코레이터를 못 쓸 때:

```ts
await RequestContext.create(orm.em, async () => {
  // 여기서 orm.em 은 요청 EM
});
```

## 함정

- **`allowGlobalContext: true`**: 토이/스크립트 외에는 켜지 말 것. 위에서 말한 누수의 원인
- **요청 단위 트랜잭션 자동화 의존**: 자동 flush 옵션에 기대다 *어디서 INSERT 가 일어났는지 추적 곤란*. 이 프로젝트처럼 *명시 `em.transactional()` + repository.save*` 를 섞는 편이 디버깅 좋다
- **스케줄러/큐에 RequestContext 안 열고 EM 사용** → 즉시 `Using global EM instance is not allowed` 에러. `@CreateRequestContext()` 필수
- **테스트에서 컨텍스트 밖에서 em.find**: 단위 테스트는 EM 자체를 mock 하거나, e2e 라면 Nest TestingModule 부팅으로 컨텍스트가 자연스럽게 열림

## JPA 와의 비교

| JPA + Spring | MikroORM + NestJS |
| --- | --- |
| `OpenEntityManagerInView` 자동 | `@nestjs/mikro-orm` 의 미들웨어가 RequestContext 자동 |
| `@PersistenceContext` 주입 | `EntityManager` 생성자 주입 |
| 스케줄러는 `@Transactional` 로 EM 열림 | `@CreateRequestContext()` 명시 필요 |

## 공식 문서

- https://mikro-orm.io/docs/identity-map#request-context
- https://mikro-orm.io/docs/usage-with-nestjs
- https://mikro-orm.io/docs/async-local-storage
