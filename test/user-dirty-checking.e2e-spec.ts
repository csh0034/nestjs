import { INestApplication } from '@nestjs/common';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { createE2EApp } from './e2e-app';
import { User } from '../src/modules/user/domain/user.entity';
import { Email } from '../src/modules/user/domain/email.vo';

describe('User 변경감지 (e2e)', () => {
  let app: INestApplication;
  let orm: MikroORM;

  beforeAll(async () => {
    ({ app, orm } = await createE2EApp());
  });

  afterAll(async () => {
    await orm.close(true);
    await app.close();
  });

  it('user 생성 후 name 만 바꾸면 트랜잭션 종료 시 변경감지로 자동 UPDATE 된다', async () => {
    const userId = await RequestContext.create(orm.em, () =>
      orm.em.transactional(async () => {
        const user = User.create({ email: Email.of('change@example.com'), name: 'before' });
        orm.em.persist(user);
        return user.id;
      }),
    );

    await RequestContext.create(orm.em, () =>
      orm.em.transactional(async () => {
        const loaded = await orm.em.findOneOrFail(User, { id: userId });
        expect(loaded.name).toBe('before');
        loaded.name = 'after';
      }),
    );

    await RequestContext.create(orm.em, async () => {
      const reloaded = await orm.em.findOneOrFail(User, { id: userId });
      expect(reloaded.name).toBe('after');
    });
  });
});
