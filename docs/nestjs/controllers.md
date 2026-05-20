# Controllers

HTTP 진입점. Spring 의 `@RestController` + `@RequestMapping` 과 거의 같다.

## 기본 형태

```ts
@Controller('orders')
export class OrderController {
  constructor(private readonly placeOrder: PlaceOrderUseCase) {}

  @Post()
  async create(@Body() body: PlaceOrderRequest): Promise<OrderView> {
    const order = await this.placeOrder.execute(body);
    return toView(order);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderView> {
    return toView(await this.getOrder.execute(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<OrderView> {
    return toView(await this.cancelOrder.execute(id));
  }
}
```

## 라우팅 데코레이터 vs Spring

| NestJS | Spring |
| --- | --- |
| `@Controller('orders')` | `@RequestMapping("/orders")` |
| `@Get('/:id')` | `@GetMapping("/{id}")` |
| `@Post()` `@Put()` `@Patch()` `@Delete()` | 동일 |
| `@Param('id')` | `@PathVariable("id")` |
| `@Query('page')` | `@RequestParam("page")` |
| `@Body()` | `@RequestBody` |
| `@Headers('x-role')` | `@RequestHeader("x-role")` |
| `@HttpCode(200)` | `@ResponseStatus(HttpStatus.OK)` |

## 응답 처리

- 기본: 메서드의 반환값이 JSON 으로 직렬화됨 (POST 는 201, 그 외는 200)
- 상태 코드 변경: `@HttpCode(...)` 또는 응답 라이브러리(`@Res()`) 직접 다루기
- `@Res()` 를 쓰면 Nest 의 자동 직렬화/Interceptor 가 **비활성** 된다. 가급적 피해라

## 컨트롤러의 역할 (이 프로젝트의 규칙)

컨트롤러는 다음만 한다:
1. HTTP 입력을 받아 (Pipe 로 검증된) DTO 로 매핑
2. 적절한 **UseCase** 를 호출
3. 도메인 객체를 **View 객체**로 변환해 반환

비즈니스 로직, 트랜잭션, 영속성 호출은 컨트롤러에 두지 않는다.

## 컨트롤러 단위 DI 와 Pipe/Guard/Interceptor 적용

```ts
@Controller('orders')
@UseInterceptors(SomeInterceptor)   // 컨트롤러 전체
@UseGuards(AuthGuard)
export class OrderController {
  @Post()
  @UseGuards(RolesGuard)             // 메서드 한정
  @Roles('admin')
  create() {}
}
```

전역 적용은 `main.ts` 의 `app.useGlobalGuards(...)` / `useGlobalInterceptors(...)` 로 한다 — 이 프로젝트가 그렇게 한다.

## 안티패턴

- 컨트롤러에 `EntityManager`/Repository 직접 주입 → 4계층 위반
- 컨트롤러에서 도메인 객체 그대로 반환 → 영속성 필드/순환 참조 노출
- `@Res()` 남용해 응답 흐름을 직접 제어 → Nest 의 Interceptor/Filter 체인이 깨짐
- 라우트마다 try/catch 로 예외 변환 → `ExceptionFilter` 에 일임

## 공식 문서

- https://docs.nestjs.com/controllers
