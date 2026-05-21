# Guards

**인가(Authorization)** 전용 컴포넌트. 요청을 처리할지 말지 `boolean` 으로 결정. Spring Security 의 `@PreAuthorize` 또는 `AccessDecisionVoter` 대응.

## 인터페이스

```ts
export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
}
```

`true` → 통과, `false` → `403 Forbidden`, 예외 → 그 예외 응답.

## 실행 순서

`Middleware → Guard → Interceptor(전) → Pipe → Handler → Interceptor(후) → Filter`

Guard 는 **Pipe 보다 먼저** 실행. 그래서 Guard 에서 `@Body()` 같은 검증된 입력에 의존하면 안 된다. 헤더/토큰/메타데이터 기반으로 결정.

## Reflector + 메타데이터 기반

이 프로젝트는 `@Roles('admin')` 데코레이터로 메타데이터를 붙이고 Guard 가 읽는 패턴:

`roles.decorator.ts`:
```ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

`roles.guard.ts`:
```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = (req.headers['x-role'] as string | undefined)?.toLowerCase();
    if (!role) return false;
    return required.map((r) => r.toLowerCase()).includes(role);
  }
}
```

`getAllAndOverride([handler, class])` → 메서드 데코레이터가 클래스 데코레이터를 **덮어쓴다**. Spring 의 `AnnotationUtils.findAnnotation()` 과 비슷.

> 참고: 최근 NestJS 는 타입 안전한 `Reflector.createDecorator()` API 도 제공한다. `SetMetadata()` 헬퍼 대신 `Reflector.createDecorator<string[]>()` 로 데코레이터를 만들면 `reflector.get(MyDecorator, handler)` 처럼 타입 추론이 되는 식. 동작은 같고, 새 코드에서는 쓰기 더 편하다. 출처: https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata

## 적용 범위

```ts
// 전역
app.useGlobalGuards(new RolesGuard(app.get(Reflector)));

// 컨트롤러
@UseGuards(RolesGuard)
@Controller('orders')

// 메서드
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':id')
```

전역으로 등록해두고, `@Roles()` 가 없으면 **통과시키는 패턴**이 일반적 (메타데이터 없으면 `canActivate` 에서 `true` 반환).

## JWT/Passport 통합

실제 인증은 보통 `@nestjs/passport` + `JwtAuthGuard` 사용. `req.user` 에 인증된 사용자를 채워주고, 그 다음 단계로 `RolesGuard` 가 권한 확인.

## ExecutionContext 의 다재다능

```ts
context.switchToHttp().getRequest()   // HTTP
context.switchToRpc().getData()       // Microservice
context.switchToWs().getClient()      // WebSocket
context.getHandler()                  // 호출될 메서드
context.getClass()                    // 컨트롤러 클래스
```

같은 Guard 가 HTTP/마이크로서비스/WebSocket 에 재사용 가능 — 이게 Nest 의 ExecutionContext 추상 의도.

## 안티패턴

- Guard 안에서 비즈니스 로직 호출(`OrderService.canCancel()`) → 인가 책임을 넘어섬. UseCase 에서 처리하고 Guard 는 *접근 자격*만
- Guard 가 응답 본문을 만들거나 `res.send()` → 책임 위반. 거부면 `false` 반환 또는 예외 throw
- `Throw new ForbiddenException` 대신 `return false` 만 — 둘 다 동작하지만, 디버깅에 좋도록 *사유 메시지*가 필요하면 예외 throw

## 공식 문서

- https://docs.nestjs.com/guards
