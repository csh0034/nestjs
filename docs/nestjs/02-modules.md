# Modules

NestJS 의 모든 것은 모듈로 구성된다. 모듈은 *DI 컨테이너의 경계* + *공개/비공개 인터페이스 정의 단위* 다.

## Spring 과 다른 점 (중요)

- Spring 의 컴포넌트 스캔처럼 자동 발견하지 않는다. **모든 provider/controller 는 어떤 모듈의 `providers`/`controllers` 에 명시적으로 등록되어야** 한다.
- 다른 모듈에서 쓰려면 **반드시 `exports` 에 넣어야** 한다. Spring 처럼 같은 패키지면 보이지 않는다.

## 구성 요소

```ts
@Module({
  imports: [...],      // 다른 모듈을 가져온다 (그 모듈의 exports 만 보임)
  providers: [...],    // 이 모듈에 등록할 서비스/리포지토리/유스케이스
  controllers: [...],  // HTTP 컨트롤러
  exports: [...],      // 외부 모듈에 노출할 provider (기본은 비공개)
})
export class UserModule {}
```

이 프로젝트의 `src/modules/user/user.module.ts`:

```ts
@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    GetUserUseCase,
    { provide: USER_REPOSITORY, useClass: UserMikroOrmRepository },
  ],
  exports: [USER_REPOSITORY, GetUserUseCase],
})
export class UserModule {}
```

`OrderModule` 은 `UserModule` 을 `imports` 에 넣어야 `USER_REPOSITORY` 와 `GetUserUseCase` 를 주입받을 수 있다. exports 하지 않은 `CreateUserUseCase` 는 외부에서 못 본다.

## Root Module

진입점 `AppModule` 이 모든 도메인 모듈을 합성한다. 인프라 모듈(`ConfigModule`, `MikroOrmModule`, `EventEmitterModule`)도 여기서 한 번만 초기화.

## Dynamic Module

설정값을 받는 모듈은 정적 `@Module()` 대신 `forRoot()`/`forRootAsync()`/`forFeature()` 패턴을 쓴다. 이 프로젝트의 `MikroOrmModule.forRootAsync({ useFactory: () => ({...}) })` 가 대표.

## Global Module

`@Global()` + root 에서 한 번 import 하면 자식 모듈에서 `imports` 없이 사용. `ConfigModule.forRoot({ isGlobal: true })` 처럼 옵션으로도 가능. 남용하면 의존 관계가 보이지 않아 *Spring 의 component scan 식 안티패턴*이 된다.

## 안티패턴

- 모든 모듈을 `@Global()` 로 만든다 → 응집도 무너짐
- 같은 provider 를 여러 모듈의 `providers` 에 중복 등록 → **인스턴스가 별개**. 의도한 게 아니라면 한 곳에서 등록 후 `exports`/`imports`
- 순환 import: `forwardRef(() => XModule)` 로 회피 가능하지만, 보통은 *모듈 경계 설계 실패의 신호*다. 공통 모듈로 분리해라.

## 공식 문서

- https://docs.nestjs.com/modules
