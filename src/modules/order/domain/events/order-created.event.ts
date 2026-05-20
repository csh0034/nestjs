import { DomainEvent } from '../../../../shared/domain/domain-event';

export class OrderCreatedEvent implements DomainEvent {
  readonly eventName = 'order.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
  ) {}
}
