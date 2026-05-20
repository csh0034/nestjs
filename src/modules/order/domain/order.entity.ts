import {
  Cascade,
  Collection,
  Entity,
  Enum,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { DomainException } from '../../../shared/domain/domain-exception';
import { Money } from '../../../shared/domain/money.vo';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';
import { OrderCreatedEvent } from './events/order-created.event';
import { OrderCanceledEvent } from './events/order-canceled.event';

@Entity({ tableName: 'orders' })
export class Order extends AggregateRoot {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  userId!: string;

  @Enum({ items: () => OrderStatus })
  status!: OrderStatus;

  @Property({ type: 'int' })
  totalAmount!: number;

  @Property({ length: 8 })
  currency!: string;

  @Property()
  createdAt: Date = new Date();

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: [Cascade.PERSIST, Cascade.REMOVE],
    eager: true,
    orphanRemoval: true,
  })
  items = new Collection<OrderItem>(this);

  static place(params: { userId: string; items: OrderItem[] }): Order {
    if (params.items.length === 0) {
      throw new DomainException('order must contain at least one item');
    }

    const order = new Order();
    order.id = randomUUID();
    order.userId = params.userId;
    order.status = OrderStatus.PENDING;

    const currency = params.items[0].currency;
    let total = Money.zero(currency);
    for (const item of params.items) {
      total = total.add(item.lineTotal());
      order.items.add(item);
    }

    order.totalAmount = total.amount;
    order.currency = total.currency;

    order.addEvent(new OrderCreatedEvent(order.id, order.userId, order.totalAmount));
    return order;
  }

  markPaid(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new DomainException(`only PENDING order can be paid, current=${this.status}`);
    }
    this.status = OrderStatus.PAID;
  }

  cancel(): void {
    if (this.status === OrderStatus.CANCELED) {
      throw new DomainException(`order ${this.id} already canceled`);
    }
    const restored = this.items.getItems().map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    }));
    this.status = OrderStatus.CANCELED;
    this.addEvent(new OrderCanceledEvent(this.id, restored));
  }

  totalAsMoney(): Money {
    return Money.of(this.totalAmount, this.currency);
  }
}
