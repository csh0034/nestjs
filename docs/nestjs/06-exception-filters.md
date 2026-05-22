# Exception Filters

예외를 HTTP 응답으로 매핑하는 컴포넌트. Spring 의 `@ControllerAdvice` + `@ExceptionHandler` 대응.

## 인터페이스

```ts
@Catch(SomeException)
export class SomeFilter implements ExceptionFilter {
  catch(exception: SomeException, host: ArgumentsHost): void { ... }
}
```

- `@Catch(...)` 에 잡을 예외 타입 지정. 비우면 모든 예외
- `host` 는 `ExecutionContext` 와 비슷한 다 환경(HTTP/RPC/WS) 추상

## 이 프로젝트의 DomainExceptionFilter

`src/shared/infrastructure/filters/domain-exception.filter.ts`:

```ts
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof NotFoundDomainException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

    res.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
```

→ 도메인 레이어가 `DomainException` 만 던지고, HTTP 상태 매핑은 인프라(Filter)가 책임. 도메인은 HTTP 를 모른다.

## 기본 제공 예외

| 예외 | 상태 |
| --- | --- |
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `UnprocessableEntityException` | 422 |
| `InternalServerErrorException` | 500 |

`HttpException` 의 자식들. 컨트롤러에서 던지면 기본 필터가 알아서 응답.

## 등록 우선순위

두 가지 우선순위가 따로 작동한다 — 헷갈리기 쉽다.

**1. 타입 매칭 (같은 scope 안)**

같은 scope 안에서는 `@Catch(...)` 의 예외 타입이 *더 구체적인* 필터가 먼저 매칭. 예: `@Catch(NotFoundDomainException)` 가 `@Catch(DomainException)` 보다 우선.

**2. Scope 해소 순서 (route ↔ global)**

NestJS 의 다른 컴포넌트는 global → controller → route 로 좁혀가지만, **Filter 만 반대**다: `route → controller → global` 순으로 매칭을 시도. route-bound filter 가 잡지 못한 예외만 controller 로, 다시 global 로 흘러간다 (공식: "filters … resolve from the lowest level possible, starting with route-bound filters and proceeding to global filters"). [출처](https://docs.nestjs.com/faq/request-lifecycle)

```ts
// main.ts
app.useGlobalFilters(new DomainExceptionFilter());

// 컨트롤러/메서드 단위
@UseFilters(SomeFilter)
```

## 클래스 토큰으로 등록 (DI 지원 필요할 때)

전역 필터가 다른 provider 를 주입받아야 한다면 `APP_FILTER`:

```ts
@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
```

`useGlobalFilters(new ...)` 는 *인스턴스 주입*이라 DI 가 제한적. provider 가 다른 서비스를 주입받아야 하면 `APP_FILTER` 쪽이 답.

## Filter vs Interceptor 의 차이

- Interceptor 의 `catchError` 도 예외를 처리할 수 있지만 — **예외 → HTTP 매핑은 Filter** 의 역할
- Filter 는 응답 본문을 직접 쓰지만 Interceptor 는 RxJS 흐름에서 동작

## 안티패턴

- 컨트롤러마다 try/catch 로 같은 예외 변환을 반복 → Filter 하나로 통합
- Filter 안에서 외부 시스템 호출(슬랙 알림 등) → 응답 지연. 비동기 큐로 빼라
- 모든 `Error` 를 잡는 `@Catch()` 만 하나 두고 5xx 로 통일 → 클라이언트가 원인 모름. 도메인 예외와 5xx 는 구분해라

## 공식 문서

- https://docs.nestjs.com/exception-filters
