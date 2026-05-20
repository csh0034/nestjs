# Dependency Injection (DI)

Spring 의 IoC 컨테이너와 동작 모델이 거의 같다. 생성자 주입을 기본으로 한다. **차이점은 토큰(Token)** 이다.

## 기본: 클래스 토큰 + 생성자 주입

```ts
@Injectable()
export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}
}
```

타입스크립트 데코레이터 메타데이터(`emitDecoratorMetadata: true`)로 `UserRepository` 클래스 토큰을 자동 인식. Spring 의 `@Autowired` 생성자 주입과 동일한 사용감.

## 인터페이스를 주입하고 싶다면 — Symbol 토큰

TypeScript 의 `interface` 는 **컴파일 후 사라진다.** 따라서 인터페이스를 토큰으로 쓸 수 없다. Spring 에서는 `UserRepository` 인터페이스를 그대로 주입할 수 있지만, NestJS 에서는 별도 토큰이 필요하다.

관례: `Symbol` 또는 `abstract class` 를 토큰으로 사용.

```ts
// domain/user.repository.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository {
  save(user: User): Promise<void>;
}

// user.module.ts
providers: [
  { provide: USER_REPOSITORY, useClass: UserMikroOrmRepository },
]

// 주입 시
constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
```

→ Spring 의 `@Qualifier` 와 비슷하지만 *필수*다.

## Custom Providers

| 형태 | 용도 | Spring 대응 |
| --- | --- | --- |
| `useClass` | 토큰을 클래스로 바인딩 | `@Bean` + 클래스 |
| `useValue` | 상수/Mock 주입 | `@Bean` + 값 |
| `useFactory` | 동적 생성 (다른 provider 의존 가능) | `@Bean` 메서드 |
| `useExisting` | 별칭 토큰 | `@Primary` 의 변형 |

```ts
{
  provide: 'CONFIG',
  useFactory: (cs: ConfigService) => ({ db: cs.get('DB_URL') }),
  inject: [ConfigService],
}
```

## Scope

기본은 **싱글톤**(Spring 과 동일). 변경 시:

| Scope | 의미 |
| --- | --- |
| `DEFAULT` | 싱글톤 (기본) |
| `REQUEST` | 요청마다 인스턴스. 요청 컨텍스트(`@Inject(REQUEST)`) 사용 가능 |
| `TRANSIENT` | 주입할 때마다 새 인스턴스 |

```ts
@Injectable({ scope: Scope.REQUEST })
```

**주의**: REQUEST scope 는 의존 그래프를 따라 **전파**된다. REQUEST scope provider 를 주입한 모든 provider 도 사실상 REQUEST 가 된다 → 성능/메모리 부담. 정말 필요한 곳에만.

## 테스트에서의 오버라이드

```ts
const moduleRef = await Test.createTestingModule({ imports: [UserModule] })
  .overrideProvider(USER_REPOSITORY)
  .useValue(mockRepo)
  .compile();
```

## 안티패턴

- 모든 인터페이스 주입에 string token (`'UserRepository'`) 사용 → 오타 위험. `Symbol` 권장
- 필드 주입(`@Inject` 프로퍼티) → 테스트가 어렵고 순환의존 발견이 늦다. 생성자 주입을 기본
- REQUEST scope 를 *전역 캐시 서비스* 같은 곳에 무심코 적용 → 전파 폭탄

## 공식 문서

- https://docs.nestjs.com/providers
- https://docs.nestjs.com/fundamentals/custom-providers
- https://docs.nestjs.com/fundamentals/injection-scopes
