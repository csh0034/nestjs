import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { DomainException } from '../../../shared/domain/domain-exception';
import { Money } from '../../../shared/domain/money.vo';

@Entity({ tableName: 'products' })
export class Product extends AggregateRoot {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  name!: string;

  @Property({ type: 'int' })
  price!: number;

  @Property({ length: 8 })
  currency!: string;

  @Property({ type: 'int' })
  stock!: number;

  @Property()
  createdAt: Date = new Date();

  static create(params: { name: string; price: Money; stock: number }): Product {
    if (params.name.trim().length === 0) {
      throw new DomainException('product name must not be empty');
    }
    if (!Number.isInteger(params.stock) || params.stock < 0) {
      throw new DomainException(`stock must be non-negative integer: ${params.stock}`);
    }
    const product = new Product();
    product.id = randomUUID();
    product.name = params.name.trim();
    product.price = params.price.amount;
    product.currency = params.price.currency;
    product.stock = params.stock;
    return product;
  }

  unitPrice(): Money {
    return Money.of(this.price, this.currency);
  }

  decreaseStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainException(`quantity must be positive integer: ${quantity}`);
    }
    if (this.stock < quantity) {
      throw new DomainException(
        `insufficient stock for product ${this.id}: have ${this.stock}, need ${quantity}`,
      );
    }
    this.stock -= quantity;
  }

  restoreStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainException(`quantity must be positive integer: ${quantity}`);
    }
    this.stock += quantity;
  }
}
