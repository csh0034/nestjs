# Decorators

NestJS / MikroORM 의 거의 모든 기능이 데코레이터로 표현된다. Kotlin/Java 의 **어노테이션 + AOP** 를 *언어 기능 하나*로 합친 형태.

## 두 가지 데코레이터 시스템 (중요)

TypeScript 에는 **두 개의 별도 시스템**이 존재한다:

| 시스템 | tsconfig 옵션 | 상태 | 사용처 |
| --- | --- | --- | --- |
| **Legacy / Experimental** | `experimentalDecorators: true` | TS 1.5부터 존재 | **NestJS, MikroORM, TypeORM, class-validator 등 거의 모든 프레임워크** |
| **Stage 3 Decorators (TC39)** | `experimentalDecorators: false` (기본) | TS 5.0+ 정식 | 신규/순수 라이브러리 일부 |

두 시스템은 **API 가 다르고 호환되지 않는다**. 이 프로젝트는 `experimentalDecorators: true` + `emitDecoratorMetadata: true` 사용 — *반드시 그래야* NestJS/MikroORM 이 동작한다.

이하 본 문서의 모든 예제는 **legacy 시스템** 기준.

출처: https://www.typescriptlang.org/docs/handbook/decorators.html

---

## 4 종류 (legacy)

```ts
@ClassDecorator()
class Foo {
  @PropertyDecorator()
  field!: string;

  @MethodDecorator()
  method(@ParameterDecorator() arg: string) {}

  @AccessorDecorator()
  get value() { return 1; }
}
```

| 종류 | 시그니처 | 흔한 예 |
| --- | --- | --- |
| Class | `(target: Function)` | `@Controller`, `@Module`, `@Entity` |
| Property | `(target, propertyKey)` | `@Property`, `@Inject`, `@IsString` |
| Method | `(target, propertyKey, descriptor)` | `@Get`, `@Post`, `@UseGuards` |
| Parameter | `(target, propertyKey, parameterIndex)` | `@Body`, `@Query`, `@Param` |
| Accessor | Method 와 동일 | (드물게) |

---

## "데코레이터 팩토리"

`@Controller('users')` 처럼 **인자 있는 데코레이터**는 사실 *데코레이터를 반환하는 함수*다.

```ts
function Controller(path: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('path', path, target);
  };
}

@Controller('users')          // 호출되어 ClassDecorator 를 만들고, 그게 적용됨
class UserController {}
```

데코레이터 자체 = 함수. 인자 받기 = 함수 호출. 단순한 모델.

---

## `emitDecoratorMetadata` + `reflect-metadata`

NestJS DI 의 *마법* 의 정체. Kotlin reflection 으로 파라미터 타입을 보는 것과 같은 일을 한다.

```ts
import 'reflect-metadata';

@Injectable()
class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}
}

// 컴파일 후 JS 로 변환되며, tsc 가 자동으로 추가:
//   Reflect.metadata("design:paramtypes", [UserRepository])
// → NestJS Reflector 가 그걸 읽어서 어떤 토큰을 주입할지 결정
```

### 필요한 조건 3개 동시 충족

1. `tsconfig.json` 에 `experimentalDecorators: true` + `emitDecoratorMetadata: true`
2. 진입점에서 `import 'reflect-metadata'` (Nest CLI 가 자동 처리)
3. **decorator 가 클래스에 1개 이상 붙어있을 것** — 없으면 `design:paramtypes` 자체가 생성 안 됨

자동으로 생성되는 메타데이터 키:

| 키 | 값 |
| --- | --- |
| `design:type` | 프로퍼티 타입 |
| `design:paramtypes` | 메서드/생성자 인자 타입 배열 |
| `design:returntype` | 메서드 반환 타입 |

### **타입 소거의 한계** (가장 큰 함정)

interface 는 런타임에 사라진다. 메타데이터에는 `Object` 로 기록됨.

```ts
interface UserRepository { ... }

@Injectable()
class GetUserUseCase {
  // ❌ design:paramtypes 가 [Object] 로 기록됨 → 주입 실패
  constructor(private readonly users: UserRepository) {}
}
```

해결 — **명시적 토큰** 으로 우회:

```ts
constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
```

이 프로젝트가 Symbol 토큰을 강제하는 이유. 자세히는 [[../nestjs/dependency-injection]].

---

## 적용 순서 (legacy)

```ts
@A @B class Foo {}
```

- **팩토리 평가**: 위에서 아래로 (`A()`, `B()`)
- **적용**: 아래에서 위로 (`B(Foo)` 먼저, 그 결과에 `A` 적용)

함수 합성과 같은 순서. 메서드/프로퍼티가 여러 데코레이터를 가질 때도 동일.

---

## 자주 보는 패턴

### 1. 메타데이터 부착 → Guard/Interceptor 가 읽기

```ts
// NestJS 가 제공
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Guard
const required = this.reflector.get<string[]>('roles', context.getHandler());
```

`SetMetadata` 는 단순한 데코레이터 팩토리: `Reflect.defineMetadata(key, value, target)` 호출.

타입 안전한 신형 API:
```ts
const Roles = Reflector.createDecorator<string[]>();
const required = this.reflector.get(Roles, ctx.getHandler());  // 타입 추론됨
```

### 2. 메서드 래핑 (around advice)

```ts
function Log(): MethodDecorator {
  return (_target, key, descriptor) => {
    const original = descriptor.value as Function;
    descriptor.value = function (...args: any[]) {
      console.log('call', key);
      const result = original.apply(this, args);
      console.log('done', key);
      return result;
    } as any;
  };
}
```

Spring AOP `@Around` 와 같은 패턴. 그러나 NestJS 에서는 보통 `Interceptor` 로 처리하는 것이 더 자연스럽다 — DI 와 RxJS 를 활용할 수 있어서. 자세히는 [[../nestjs/interceptors]].

### 3. class-validator (선언적 검증)

```ts
class CreateUserDto {
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
}
```

`ValidationPipe` 가 `class-validator` 의 메타데이터를 읽어서 검증. Bean Validation 과 거의 동일한 사용감. 자세히는 [[../nestjs/pipes]].

---

## 안티패턴

- 데코레이터 안에서 **다른 인스턴스를 직접 생성** — DI 가 박살남. `@Inject` 또는 팩토리로 해결
- 데코레이터로 *비즈니스 로직* 구현 — 데코레이터는 "메타데이터 부착" 또는 "얇은 래핑" 정도가 적정. 복잡한 동작은 Interceptor/Guard 로
- 두 데코레이터 시스템 혼용 — 신형 stage 3 데코레이터와 legacy 를 같이 못 쓴다. 프레임워크가 요구하는 쪽으로 일관
- 데코레이터에서 던진 예외를 무시 — 모듈 로딩 시점에 터지면 *애플리케이션 시작 자체가 실패*

## 공식 문서

- TS Decorators (legacy): https://www.typescriptlang.org/docs/handbook/decorators.html
- NestJS Custom Decorators: https://docs.nestjs.com/custom-decorators
- NestJS Execution Context & Reflector: https://docs.nestjs.com/fundamentals/execution-context
- reflect-metadata 제안: https://rbuckton.github.io/reflect-metadata/
