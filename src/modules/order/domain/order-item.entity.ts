import { Entity, ManyToOne, PrimaryKey, Property, Rel } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { Money } from '../../../shared/domain/money.vo';
import { Order } from './order.entity';

@Entity({ tableName: 'order_items' })
export class OrderItem {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Order)
  order!: Rel<Order>;

  @Property({ type: 'uuid' })
  productId!: string;

  @Property({ type: 'int' })
  quantity!: number;

  @Property({ type: 'int' })
  unitPrice!: number;

  @Property({ length: 8 })
  currency!: string;

  static create(params: { productId: string; quantity: number; unitPrice: Money }): OrderItem {
    const item = new OrderItem();
    item.id = randomUUID();
    item.productId = params.productId;
    item.quantity = params.quantity;
    item.unitPrice = params.unitPrice.amount;
    item.currency = params.unitPrice.currency;
    return item;
  }

  lineTotal(): Money {
    return Money.of(this.unitPrice, this.currency).multiply(this.quantity);
  }
}
