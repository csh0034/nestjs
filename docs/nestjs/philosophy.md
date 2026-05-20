# NestJS 아키텍처 개요

NestJS 공식 문서(docs.nestjs.com)에 명시된 정의·구성 요소·라이프사이클을 그대로 정리.

## 정의

> A progressive Node.js framework for building efficient, reliable and scalable server-side applications. — *docs.nestjs.com*

핵심:
- **TypeScript 우선** (JavaScript 도 지원)
- **OOP(객체지향) + FP(함수형) + FRP(함수형 반응형)** 요소를 결합
- 내부적으로 **HTTP 서버 프레임워크 위에서 동작**: 기본은 Express, 옵션으로 Fastify (platform-agnostic)
- Angular 에서 영감을 받은 **모듈 시스템**

출처: https://docs.nestjs.com/

---

## 구성 요소 (Building Blocks)

NestJS 가 공식적으로 분류하는 요소들:

| 요소 | 역할 |
| --- | --- |
| **Module** | 애플리케이션 구조의 단위. `@Module()` 데코레이터로 정의 |
| **Controller** | 들어오는 요청을 받고 응답을 돌려주는 HTTP 진입점 |
| **Provider** | 서비스/리포지토리/팩토리 등 IoC 컨테이너가 관리하는 객체. `@Injectable()` |
| **Middleware** | 라우트 핸들러 전에 실행되는 함수. Express middleware 와 동일 모델 |
| **Pipe** | 데이터 검증(validation) / 변환(transformation) |
| **Guard** | 인가(authorization) — 요청 처리 여부 결정 |
| **Interceptor** | 핸들러 실행 전·후에 끼어드는 횡단관심사. RxJS 기반 |
| **Exception Filter** | 처리되지 않은 예외를 잡아 응답으로 변환 |

→ 각 요소의 상세는 같은 디렉터리의 별도 문서 참고.

---

## Request Lifecycle (공식)

요청 1건이 처리되는 동안 NestJS 가 보장하는 실행 순서:

```
Incoming Request
    ↓
Middleware (globally bound → module bound)
    ↓
Guards (global → controller → route)
    ↓
Interceptors (global → controller → route, before)
    ↓
Pipes (global → controller → route → route-parameter)
    ↓
Controller (route handler)
    ↓
Service (호출되는 provider)
    ↓
Interceptors (after)
    ↓
Exception Filter (예외가 발생했다면, route → controller → global 순으로 매칭)
    ↓
Server Response
```

같은 종류 안에서는 **global → controller → route 순으로 적용 범위가 좁아진다**.

출처: https://docs.nestjs.com/faq/request-lifecycle

---

## Modules — IoC 경계

`@Module()` 데코레이터의 네 가지 속성:

```ts
@Module({
  imports: [...],      // 이 모듈이 의존하는 다른 모듈
  controllers: [...],  // 인스턴스화될 컨트롤러
  providers: [...],    // Nest injector 가 인스턴스화하고 주입에 사용할 provider
  exports: [...],      // 다른 모듈에서 사용할 수 있도록 노출할 provider 의 일부
})
```

특징:
- `@Module()` 데코레이터로 명시 등록한 것만 컨테이너에 들어간다 — *암묵 스캔 없음*
- provider 를 다른 모듈에서 쓰려면 `exports` 가 필요
- `forRoot()` / `forRootAsync()` / `forFeature()` 같은 **dynamic module** 패턴으로 설정값을 받는다

출처: https://docs.nestjs.com/modules

---

## Dependency Injection

- 생성자 주입을 기본 패턴으로 사용
- **토큰(token)** 으로 provider 를 식별: 클래스 자체 / 문자열 / Symbol
- TypeScript 인터페이스는 런타임에 사라지므로, 인터페이스를 주입하려면 별도 토큰(Symbol 권장)을 명시
- Scope: `DEFAULT`(싱글톤) / `REQUEST` / `TRANSIENT`

출처: https://docs.nestjs.com/providers, https://docs.nestjs.com/fundamentals/custom-providers

---

## Platform Agnostic — HTTP 어댑터

같은 애플리케이션 코드가 두 HTTP 프레임워크 위에서 동작:
- `@nestjs/platform-express` (기본)
- `@nestjs/platform-fastify` (옵션)

`platform-*` 패키지가 underlying 라이브러리의 차이를 추상화. 일반적인 컨트롤러/서비스 코드는 변경 없이 어댑터 교체 가능.

출처: https://docs.nestjs.com/first-steps#platform

---

## Transport Agnostic — Microservices / WebSocket / GraphQL

HTTP 외의 전송 계층도 동일한 모듈/DI/파이프라인 모델로 다룸:

- **Microservices** (`@nestjs/microservices`): TCP, Redis, NATS, MQTT, RabbitMQ, Kafka, gRPC
- **WebSocket** (`@nestjs/websockets`)
- **GraphQL** (`@nestjs/graphql`)

이를 가능하게 하는 추상이 **`ExecutionContext`** 다. Guard / Interceptor 등이 작성될 때 HTTP/RPC/WS 어느 쪽이든 같은 인터페이스로 다룰 수 있다:

```ts
context.switchToHttp().getRequest();
context.switchToRpc().getData();
context.switchToWs().getClient();
context.getHandler();   // 호출될 메서드 참조
context.getClass();     // 호출될 컨트롤러 클래스
```

출처: https://docs.nestjs.com/fundamentals/execution-context, https://docs.nestjs.com/microservices/basics

---

## 데코레이터 + Reflect Metadata

NestJS 의 동작 대부분이 *데코레이터로 부착된 메타데이터*에 기반:
- `@Controller()`, `@Get()`, `@Post()` → 라우트 메타데이터
- `@Injectable()` → IoC 등록 대상 표시
- `@Inject(token)` → 주입 토큰 명시
- `SetMetadata()` / 사용자 정의 데코레이터 → 임의 메타데이터
- `Reflector` → 런타임에 그 메타데이터를 다시 읽는 객체 (Guard 에서 `@Roles()` 읽을 때 사용)

`emitDecoratorMetadata: true` + `reflect-metadata` 패키지를 전제로 동작한다.

출처: https://docs.nestjs.com/fundamentals/custom-decorators

---

## 함께 보기

- [modules.md](./modules.md)
- [dependency-injection.md](./dependency-injection.md)
- [controllers.md](./controllers.md)
- [pipes.md](./pipes.md) · [guards.md](./guards.md) · [interceptors.md](./interceptors.md) · [exception-filters.md](./exception-filters.md)
