# Pipes

요청 입력의 **검증(validation)** 과 **변환(transformation)** 을 담당. Spring 의 `Bean Validation` + `Converter` 가 한 추상으로 합쳐졌다.

## 두 가지 역할

1. **Validation**: 입력이 규칙을 만족하지 않으면 `BadRequestException` 으로 거부
2. **Transformation**: 원시값을 타입으로 변환 (예: `"123"` → `123`, `"abc-..."` → UUID 문자열 검증 통과)

## 기본 제공 Pipe

| Pipe | 용도 |
| --- | --- |
| `ValidationPipe` | DTO + class-validator 데코레이터 기반 검증 |
| `ParseIntPipe` | string → number, 실패 시 400 |
| `ParseUUIDPipe` | UUID 형식 검증 |
| `ParseBoolPipe`, `ParseArrayPipe`, `ParseEnumPipe` | 이름 그대로 |
| `DefaultValuePipe(value)` | 기본값 주입 |

이 프로젝트의 `OrderController`:

```ts
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
```

## ValidationPipe + DTO + class-validator

이 조합이 Spring 의 `@Valid @RequestBody Dto` 와 가장 유사하다.

`src/modules/user/presentation/dto/create-user.request.ts`:

```ts
export class CreateUserRequest {
  @IsEmail()
  email!: string;

  @IsString() @MinLength(1) @MaxLength(50)
  name!: string;

  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;
}
```

전역 등록 (`main.ts`):

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // DTO 에 없는 필드는 제거
  forbidNonWhitelisted: true,   // 또는 400 으로 거부
  transform: true,              // plain object → 클래스 인스턴스
  transformOptions: { enableImplicitConversion: true }, // 쿼리스트링 number 변환 등
}));
```

| 옵션 | Spring 대응 |
| --- | --- |
| `whitelist` | Jackson `FAIL_ON_UNKNOWN_PROPERTIES = false` 와 비슷 |
| `forbidNonWhitelisted` | Jackson 의 `FAIL_ON_UNKNOWN_PROPERTIES = true` |
| `transform` | `MessageConverter` + 생성자 매핑 |

## 중첩 객체 검증 — `@ValidateNested` + `@Type`

```ts
export class PlaceOrderRequest {
  @IsUUID() userId!: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlaceOrderItemRequest)   // class-transformer 가 nested 클래스 인스턴스 생성
  items!: PlaceOrderItemRequest[];
}
```

`@Type()` 빠뜨리면 nested 객체가 plain object 라서 데코레이터 검증이 동작하지 않는다 — 흔한 함정.

## 커스텀 Pipe

```ts
@Injectable()
export class TrimPipe implements PipeTransform<string, string> {
  transform(value: string) { return value?.trim(); }
}
```

`@UsePipes(...)` 또는 `@Body(new TrimPipe())` 로 적용.

## 안티패턴

- Pipe 안에서 DB 조회/비즈니스 검증 (예: 이메일 중복 확인) → Pipe 는 *형식 검증*까지만. 도메인 검증은 UseCase 에서
- `transform: false` 인 채로 `enableImplicitConversion` 만 켜기 → 동작 안 함. `transform: true` 필수
- 컨트롤러마다 Pipe 옵션을 새로 만들기 → 전역 `useGlobalPipes` 1회

## 공식 문서

- https://docs.nestjs.com/pipes
- class-validator: https://github.com/typestack/class-validator
- class-transformer: https://github.com/typestack/class-transformer
