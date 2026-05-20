import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityManager } from '@mikro-orm/mariadb';
import { UseCase } from '../../../../shared/application/use-case';
import { NotFoundDomainException } from '../../../../shared/domain/domain-exception';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../product/domain/product.repository';
import { Order } from '../../domain/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order.repository';

@Injectable()
export class CancelOrderUseCase implements UseCase<string, Order> {
  private readonly logger = new Logger(CancelOrderUseCase.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly eventBus: EventEmitter2,
  ) {}

  async execute(orderId: string): Promise<Order> {
    return this.em.transactional(async () => {
      const order = await this.orders.findById(orderId);
      if (!order) {
        throw new NotFoundDomainException(`order not found: ${orderId}`);
      }

      order.cancel();

      const productIds = order.items.getItems().map((i) => i.productId);
      const products = await this.products.findByIds(productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of order.items.getItems()) {
        const product = productMap.get(item.productId);
        if (!product) continue;
        product.restoreStock(item.quantity);
      }

      await this.orders.save(order);

      this.publishDomainEvents(order);
      this.logger.log(`order canceled: ${order.id}`);
      return order;
    });
  }

  private publishDomainEvents(order: Order): void {
    for (const event of order.pullDomainEvents()) {
      this.eventBus.emit(event.eventName, event);
    }
  }
}
