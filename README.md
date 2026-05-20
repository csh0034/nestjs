# nestjs-ddd-toy

NestJS + MikroORM 으로 작성한 DDD/Clean Architecture 토이 프로젝트. 주문 시스템(User-Product-Order) 도메인을 통해 DI / AOP(Interceptor/Guard/Pipe) / 트랜잭션 / 도메인 이벤트를 학습한다.

## 사전 준비

- Node.js 20 LTS 이상, pnpm 8 이상
- 로컬 MariaDB (127.0.0.1:3306, root / 111111)
- DB 두 개 생성:
  ```sql
  CREATE DATABASE IF NOT EXISTS nestjs_toy;
  CREATE DATABASE IF NOT EXISTS nestjs_toy_test;
  ```
  (e2e 테스트는 `refreshDatabase()` 가 자동 생성 시도하지만, 권한이나 collation 이슈 회피용으로 미리 만들어두는 편이 안전)

## 설치 & 구동

```bash
pnpm install
pnpm schema:create     # 개발 DB(nestjs_toy)에 스키마 생성. 또는 마이그레이션 사용
pnpm start:dev
# http://localhost:3000
```

## 테스트

```bash
pnpm test              # 단위 테스트
pnpm test:cov          # 커버리지
pnpm test:e2e          # e2e (nestjs_toy_test 사용, 매 실행 시 스키마 refresh)
pnpm lint
```

## 빠른 사용 예시 (curl)

```bash
# 사용자
curl -s -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"email":"kim@example.com","name":"kim"}' | jq

# 상품
curl -s -X POST http://localhost:3000/products \
  -H 'content-type: application/json' \
  -d '{"name":"아메리카노","price":4500,"stock":5}' | jq

# 주문
curl -s -X POST http://localhost:3000/orders \
  -H 'content-type: application/json' \
  -d '{"userId":"<USER_ID>","items":[{"productId":"<PRODUCT_ID>","quantity":3}]}' | jq

# 주문 취소 (admin 권한 필요 - x-role 헤더로 인가)
curl -s -X DELETE http://localhost:3000/orders/<ORDER_ID> -H 'x-role: admin' | jq
```

## 아키텍처 / 안티패턴 / JPA 매핑

`CLAUDE.md` 참고. Spring Boot Kotlin JPA 의 개념(@Component, @Repository, EntityManager, @Transactional, AOP, @PreAuthorize, Bean Validation) 이 NestJS/MikroORM 에서 어떻게 대응되는지 정리해두었다.
