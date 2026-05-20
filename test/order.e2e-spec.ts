import { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import request from 'supertest';
import { createE2EApp } from './e2e-app';

describe('주문 시나리오 (e2e)', () => {
  let app: INestApplication;
  let orm: MikroORM;

  beforeAll(async () => {
    ({ app, orm } = await createE2EApp());
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  it('사용자 생성 → 상품 생성 → 주문 → 재고 차감 → 권한 검증 → 취소 → 재고 복구', async () => {
    const server = app.getHttpServer();

    const userRes = await request(server)
      .post('/users')
      .send({ email: 'kim@example.com', name: 'kim' })
      .expect(201);
    const userId = userRes.body.id as string;

    const productRes = await request(server)
      .post('/products')
      .send({ name: '아메리카노', price: 4500, stock: 5 })
      .expect(201);
    const productId = productRes.body.id as string;

    const orderRes = await request(server)
      .post('/orders')
      .send({ userId, items: [{ productId, quantity: 3 }] })
      .expect(201);
    const orderId = orderRes.body.id as string;
    expect(orderRes.body.totalAmount).toBe(13500);
    expect(orderRes.body.status).toBe('pending');

    const afterPlace = await request(server).get(`/products/${productId}`).expect(200);
    expect(afterPlace.body.stock).toBe(2);

    await request(server).delete(`/orders/${orderId}`).expect(403);

    await request(server).delete(`/orders/${orderId}`).set('x-role', 'user').expect(403);

    const cancelRes = await request(server)
      .delete(`/orders/${orderId}`)
      .set('x-role', 'admin')
      .expect(200);
    expect(cancelRes.body.status).toBe('canceled');

    const afterCancel = await request(server).get(`/products/${productId}`).expect(200);
    expect(afterCancel.body.stock).toBe(5);
  });

  it('잘못된 DTO 는 400 으로 거부한다 (ValidationPipe 동작)', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-email', name: '' })
      .expect(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('존재하지 않는 사용자의 주문은 404 로 거부한다', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        items: [{ productId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', quantity: 1 }],
      })
      .expect(404);
  });
});
