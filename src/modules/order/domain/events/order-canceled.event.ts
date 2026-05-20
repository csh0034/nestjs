import { DomainEvent } from '../../../../shared/domain/domain-event';

export class OrderCanceledEvent implements DomainEvent {
  readonly eventName = 'order.canceled';
  readonly occurredAt = new Date();

  constructor(
    public readonly orderId: string,
    public readonly restoredItems: ReadonlyArray<{ productId: string; quantity: number }>,
  ) {}
}
