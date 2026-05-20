import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mariadb';
import { Order } from '../../domain/order.entity';
import { OrderRepository } from '../../domain/order.repository';

@Injectable()
export class OrderMikroOrmRepository implements OrderRepository {
  constructor(private readonly em: EntityManager) {}

  async save(order: Order): Promise<void> {
    this.em.persist(order);
    await this.em.flush();
  }

  findById(id: string): Promise<Order | null> {
    return this.em.findOne(Order, { id }, { populate: ['items'] });
  }
}
