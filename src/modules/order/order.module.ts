import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { Order } from './domain/order.entity';
import { OrderItem } from './domain/order-item.entity';
import { ORDER_REPOSITORY } from './domain/order.repository';
import { OrderMikroOrmRepository } from './infrastructure/persistence/order.mikro-orm.repository';
import { PlaceOrderUseCase } from './application/commands/place-order.use-case';
import { CancelOrderUseCase } from './application/commands/cancel-order.use-case';
import { GetOrderUseCase } from './application/queries/get-order.use-case';
import { OrderCanceledHandler } from './application/handlers/order-canceled.handler';
import { OrderController } from './presentation/order.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Order, OrderItem]), UserModule, ProductModule],
  controllers: [OrderController],
  providers: [
    PlaceOrderUseCase,
    CancelOrderUseCase,
    GetOrderUseCase,
    OrderCanceledHandler,
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderMikroOrmRepository,
    },
  ],
})
export class OrderModule {}
