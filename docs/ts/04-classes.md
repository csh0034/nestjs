# Classes

TypeScript class 는 JS ES2015 class 위에 **접근 제한자 + 타입 + 데코레이터**를 얹은 것. Kotlin class 와 사용감이 가깝지만, 몇 가지 함정이 있다.

## 기본

```ts
class User {
  private readonly id: string;
  email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }

  greet(): string {
    return `hi, ${this.email}`;
  }
}
```

| 키워드 | 의미 |
| --- | --- |
| `public` (기본) | 어디서나 접근 |
| `protected` | 자기 + 자식 클래스 |
| `private` | 자기만. **컴파일 타임 검사**. 런타임엔 그냥 접근 가능 |
| `#field` | **진짜 private**. 런타임에도 외부 접근 차단 (ES2022) |
| `readonly` | 생성자에서만 할당, 이후 변경 불가 |
| `static` | 인스턴스 없이 클래스에서 접근 |
| `abstract` | 추상 클래스/메서드 |

`private` vs `#field`: 대부분의 TS 코드는 `private` 키워드를 쓴다. *진짜 캡슐화*가 필요하면 `#`. 이 프로젝트는 모두 `private` 키워드를 사용.

---

## Parameter Property (생성자 단축)

NestJS 코드에서 가장 자주 보는 패턴. Kotlin 의 *생성자 프로퍼티* 와 동일한 동기.

```ts
// 길게
class GetUserUseCase {
  private readonly users: UserRepository;
  constructor(users: UserRepository) { this.users = users; }
}

// 단축 — 생성자 인자에 접근 제한자/readonly 를 붙이면 자동 필드화
class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}
}
```

이 프로젝트의 모든 UseCase·Repository·Controller 가 이 단축을 사용. Spring 의 `@RequiredArgsConstructor` + final 필드 조합과 같은 결과.

---

## Abstract class

```ts
export abstract class AggregateRoot {
  private _domainEvents?: DomainEvent[];

  protected addEvent(event: DomainEvent): void {
    if (!this._domainEvents) this._domainEvents = [];
    this._domainEvents.push(event);
  }
}

export class Order extends AggregateRoot { /* ... */ }
```

Kotlin `abstract class` 와 동일. 인스턴스화 불가, 자식이 일부 멤버 구현.

`interface` 와 차이: `interface` 는 **타입만**, `abstract class` 는 **타입 + 런타임 표현**. DI 토큰으로 사용 가능한 이유.

---

## Getter / Setter (accessor)

```ts
class Money {
  constructor(private _amount: number) {}

  get amount(): number { return this._amount; }
  set amount(v: number) {
    if (v < 0) throw new Error('negative');
    this._amount = v;
  }
}

const m = new Money(100);
m.amount;       // 100 (메서드 호출 아님)
m.amount = 50;  // setter 호출
```

Kotlin `val/var` + 커스텀 getter 와 동일한 위치. 단, 이 프로젝트의 도메인은 *명시적 메서드*(`markPaid()`)를 선호하고 setter 는 거의 안 씀 (도메인 불변식 보호).

---

## `this` 의 함정 — 화살표 메서드

JS/TS 의 `this` 는 **호출 방식에 따라 바뀐다**. Kotlin/Java 와 가장 다른 부분.

```ts
class Logger {
  prefix = '[app]';
  log(msg: string) { console.log(this.prefix, msg); }
}

const l = new Logger();
const fn = l.log;
fn('hi');   // ❌ TypeError: this 가 undefined
```

해결 방법:

```ts
class Logger {
  prefix = '[app]';
  // 화살표 함수로 정의 → this 가 인스턴스에 박힘
  log = (msg: string) => { console.log(this.prefix, msg); };
}
```

또는 호출 시 `l.log.bind(l)`. NestJS 컨트롤러 메서드는 프레임워크가 `bind` 처리해주므로 일반적으론 신경 안 써도 됨. 콜백으로 메서드를 넘길 때만 주의.

---

## `instanceof` 의 한계

```ts
abstract class Animal {}
class Dog extends Animal {}

const x = new Dog();
x instanceof Dog;      // true
x instanceof Animal;   // true

interface Walker { walk(): void }
x instanceof Walker;   // ❌ 컴파일 에러 — interface 는 런타임에 없음
```

interface 로 좁히고 싶다면 [[02-type-system]] 의 *타입 가드 함수* 참고.

---

## Class field 초기화의 함정 (MikroORM 주의사항)

이 프로젝트의 CLAUDE.md 에도 명시된 함정:

```ts
class Aggregate {
  // ❌ MikroORM 이 DB → 객체로 복원할 때 이 초기화가 실행되지 않을 수 있다
  events: Event[] = [];
}
```

MikroORM 의 `hydrate` 단계에서 *생성자/필드 초기화* 가 건너뛰어진다. 항상 비어있을 거라 가정하면 hydrate 된 객체에서 NPE.

해결:

```ts
class Aggregate {
  private _events?: Event[];      // 옵셔널로 두고
  addEvent(e: Event) {
    if (!this._events) this._events = [];   // lazy init
    this._events.push(e);
  }
}
```

이 프로젝트의 `AggregateRoot` 가 정확히 이 패턴이다. 자세히는 [[../mikro-orm/entities]] 참고.

---

## 상속과 `super`

```ts
class Order extends AggregateRoot {
  constructor() {
    super();        // 반드시 첫 줄에서 부모 생성자 호출
  }
}
```

Kotlin 과 동일. 단, JS 는 *단일 상속*만 가능 (Kotlin 도 마찬가지). 다중 상속이 필요하면 mixin 패턴 또는 interface 다중 구현.

---

## `implements` vs `extends`

```ts
interface Sayable { say(): void }
abstract class Base { abstract greet(): void }

class A implements Sayable { say() {} }
class B extends Base { greet() {} }
class C extends Base implements Sayable { say() {} greet() {} }
```

| 키워드 | 대상 | 의미 |
| --- | --- | --- |
| `extends` | class / abstract class | 구현 상속. 메서드/필드 물려받음 |
| `implements` | interface (또는 class shape) | 모양만 강제. 코드는 안 받음 |

여러 인터페이스를 `implements A, B, C` 로 동시 구현 가능.

---

## 안티패턴

- 도메인 객체에 public setter 남발 → 불변식 보호 실패. 명시적 메서드(`markPaid`)를 사용
- 화살표 메서드(`log = (...) => ...`)를 **모든** 메서드에 적용 → 상속/오버라이드/프로토타입 검사 깨짐. *콜백으로 넘기는* 메서드에만 한정
- 필드 초기화 의존 (`items: Item[] = []`) — MikroORM hydration 에서 누락 위험 (위 참조)
- `private` 필드를 테스트에서 `(obj as any)._field` 로 우회 → 캡슐화 우회. 테스트 가능한 인터페이스를 노출하든지 검증 메서드 추가

## 공식 문서

- Classes: https://www.typescriptlang.org/docs/handbook/2/classes.html
- Parameter Properties: https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties
