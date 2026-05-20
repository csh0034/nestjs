import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';
import { Money } from '../../../shared/domain/money.vo';
import { DomainException } from '../../../shared/domain/domain-exception';
import { OrderCreatedEvent } from './events/order-created.event';
import { OrderCanceledEvent } from './events/order-canceled.event';

describe('Order', () => {
  const makeItem = (quantity: number, price = 1000) =>
    OrderItem.create({
      productId: '11111111-1111-1111-1111-111111111111',
      quantity,
      unitPrice: Money.of(price),
    });

  it('items가 비어 있으면 생성을 거부한다', () => {
    expect(() => Order.place({ userId: 'u1', items: [] })).toThrow(DomainException);
  });

  it('총액을 계산하고 PENDING 상태로 시작한다', () => {
    const order = Order.place({
      userId: 'u1',
      items: [makeItem(2, 1000), makeItem(1, 500)],
    });
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.totalAmount).toBe(2500);
  });

  it('생성 시 OrderCreatedEvent 를 발행한다', () => {
    const order = Order.place({ userId: 'u1', items: [makeItem(1)] });
    const events = order.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderCreatedEvent);
  });

  it('PENDING -> PAID 전이만 허용한다', () => {
    const order = Order.place({ userId: 'u1', items: [makeItem(1)] });
    order.markPaid();
    expect(order.status).toBe(OrderStatus.PAID);
    expect(() => order.markPaid()).toThrow(DomainException);
  });

  it('취소 시 OrderCanceledEvent 를 발행한다', () => {
    const order = Order.place({ userId: 'u1', items: [makeItem(2)] });
    order.pullDomainEvents();
    order.cancel();
    expect(order.status).toBe(OrderStatus.CANCELED);
    const events = order.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderCanceledEvent);
    expect((events[0] as OrderCanceledEvent).restoredItems).toEqual([
      { productId: '11111111-1111-1111-1111-111111111111', quantity: 2 },
    ]);
  });

  it('이미 취소된 주문은 다시 취소할 수 없다', () => {
    const order = Order.place({ userId: 'u1', items: [makeItem(1)] });
    order.cancel();
    expect(() => order.cancel()).toThrow(DomainException);
  });
});
