import { MikroORM } from '@mikro-orm/mariadb';
import { User } from '../src/modules/user/domain/user.entity';
import { Product } from '../src/modules/product/domain/product.entity';
import { Order } from '../src/modules/order/domain/order.entity';
import { OrderItem } from '../src/modules/order/domain/order-item.entity';

declare global {
  // eslint-disable-next-line no-var
  var __MIKRO_ORM_METADATA__: MikroORM | undefined;
}

beforeAll(async () => {
  if (global.__MIKRO_ORM_METADATA__) return;
  global.__MIKRO_ORM_METADATA__ = await MikroORM.init({
    dbName: 'metadata-only',
    user: 'root',
    password: '',
    host: '127.0.0.1',
    entities: [User, Product, Order, OrderItem],
    connect: false,
    allowGlobalContext: true,
    discovery: { warnWhenNoEntities: false },
  });
});
