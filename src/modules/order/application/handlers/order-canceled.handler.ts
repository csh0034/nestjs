import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCanceledEvent } from '../../domain/events/order-canceled.event';

@Injectable()
export class OrderCanceledHandler {
  private readonly logger = new Logger(OrderCanceledHandler.name);

  @OnEvent('order.canceled')
  handle(event: OrderCanceledEvent): void {
    this.logger.log(
      `[event] order ${event.orderId} canceled, ${event.restoredItems.length} items restored`,
    );
  }
}
