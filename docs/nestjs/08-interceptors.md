# Interceptors

핸들러 실행 **전후**에 끼어들어 횡단관심사(로깅, 캐시, 트랜잭션, 변환)를 처리. Spring 의 AOP `@Around` 와 동일한 의도.

## 인터페이스

```ts
export interface NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
```

`next.handle()` 이 핸들러를 호출하는 시점이고, 반환은 **RxJS `Observable`** 이다. AOP 의 `proceed()` 호출과 같은 위치.

## 이 프로젝트의 LoggingInterceptor

`src/shared/infrastructure/interceptors/logging.interceptor.ts`:

```ts
intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  const req = context.switchToHttp().getRequest<Request>();
  const handler = `${context.getClass().name}#${context.getHandler().name}`;
  const startedAt = Date.now();

  this.logger.log(`-> ${req.method} ${req.url} (${handler})`);

  return next.handle().pipe(
    tap({
      next: () => this.logger.log(`<- ${req.method} ${req.url} ${Date.now() - startedAt}ms`),
      error: (err) => this.logger.warn(`xx ${err.message}`),
    }),
  );
}
```

핵심:
- `next.handle()` 호출 **전**: 메서드 진입 직전 처리 → AOP `@Before`
- `tap({ next })`: 정상 응답 *직후* → `@AfterReturning`
- `tap({ error })`: 예외 발생 직후 → `@AfterThrowing`
- 응답 본문 **변형**도 가능 (`map(value => ({ data: value, ts: Date.now() }))`)

## 자주 쓰는 RxJS 오퍼레이터

| 오퍼레이터 | 용도 |
| --- | --- |
| `tap({ next, error })` | side effect (로그/메트릭) |
| `map(value => ...)` | 응답 변환 (DTO wrapping) |
| `catchError(err => ...)` | 예외 변환 (보통은 ExceptionFilter 가 더 적합) |
| `timeout(ms)` | 응답 타임아웃 |

## 적용 범위

```ts
app.useGlobalInterceptors(new LoggingInterceptor());   // 전역
@UseInterceptors(SomeInterceptor)                       // 컨트롤러/메서드
```

## Guard 와의 차이

| | Guard | Interceptor |
| --- | --- | --- |
| 목적 | 인가 (boolean) | 횡단관심사 (로깅/캐싱/변환) |
| 반환 | true/false | Observable |
| 위치 | 핸들러 전 | 핸들러 전+후 |
| 응답 변형 | 불가 | 가능 |

## ClassSerializerInterceptor (자주 보는 빌트인)

`@Exclude()`/`@Expose()` 로 응답에서 필드를 숨기거나 노출:

```ts
@UseInterceptors(ClassSerializerInterceptor)
@Get(':id')
async findOne(): Promise<User> { ... }
```

다만 도메인 객체에 `@Exclude()` 를 박는 건 *프레임워크 침범*이라 이 프로젝트는 View 객체로 매핑하는 쪽을 택했다.

## 안티패턴

- Interceptor 안에서 비즈니스 로직 호출 → AOP 의 *불투명한 동작* 함정. 로직은 UseCase 에 둬라
- Interceptor 에서 응답 본문 구조를 *전역적으로* 감싸기 (`{ data: ..., success: true }`) → 컨트롤러 시그니처와 실제 응답이 어긋남. 가능하면 명시적으로
- Interceptor 의 `next.handle()` 호출을 잊고 RxJS 체인을 끊기 → 핸들러가 영영 실행되지 않음

## 공식 문서

- https://docs.nestjs.com/interceptors
- RxJS 오퍼레이터: https://rxjs.dev/guide/operators
