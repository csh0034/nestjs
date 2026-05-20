import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case';
import { NotFoundDomainException } from '../../../../shared/domain/domain-exception';
import { Order } from '../../domain/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/order.repository';

@Injectable()
export class GetOrderUseCase implements UseCase<string, Order> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,
  ) {}

  async execute(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundDomainException(`order not found: ${id}`);
    }
    return order;
  }
}
