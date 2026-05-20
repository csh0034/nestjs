import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager } from '@mikro-orm/mariadb';
import { UseCase } from '../../../../shared/application/use-case';
import {
  DomainException,
  NotFoundDomainException,
} from '../../../../shared/domain/domain-exception';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../product/domain/product.repository';
import { USER_REPOSITORY, UserRepository } from '../../../user/domain/user.repository';
import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/order-item.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order.repository';
import { PlaceOrderCommand } from '../dto/place-order.command';

@Injectable()
export class PlaceOrderUseCase implements UseCase<PlaceOrderCommand, Order> {
  private readonly logger = new Logger(PlaceOrderUseCase.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly eventBus: EventEmitter2,
  ) {}

  async execute(input: PlaceOrderCommand): Promise<Order> {
    return this.em.transactional(async () => {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new NotFoundDomainException(`user not found: ${input.userId}`);
      }

      if (input.items.length === 0) {
        throw new DomainException('order must contain at least one item');
      }

      const productIds = input.items.map((i) => i.productId);
      const products = await this.products.findByIds(productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      const orderItems: OrderItem[] = [];
      for (const line of input.items) {
        const product = productMap.get(line.productId);
        if (!product) {
          throw new NotFoundDomainException(`product not found: ${line.productId}`);
        }
        product.decreaseStock(line.quantity);
        orderItems.push(
          OrderItem.create({
            productId: product.id,
            quantity: line.quantity,
            unitPrice: product.unitPrice(),
          }),
        );
      }

      const order = Order.place({ userId: user.id, items: orderItems });
      await this.orders.save(order);

      this.publishDomainEvents(order);
      this.logger.log(`order placed: ${order.id} total=${order.totalAmount}`);
      return order;
    });
  }

  private publishDomainEvents(order: Order): void {
    for (const event of order.pullDomainEvents()) {
      this.eventBus.emit(event.eventName, event);
    }
  }
}
