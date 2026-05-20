import { Product } from './product.entity';
import { Money } from '../../../shared/domain/money.vo';
import { DomainException } from '../../../shared/domain/domain-exception';

describe('Product', () => {
  const newProduct = (stock = 5) =>
    Product.create({ name: '아메리카노', price: Money.of(4500), stock });

  it('재고가 충분하면 차감한다', () => {
    const p = newProduct(5);
    p.decreaseStock(3);
    expect(p.stock).toBe(2);
  });

  it('재고가 부족하면 거부한다', () => {
    const p = newProduct(2);
    expect(() => p.decreaseStock(3)).toThrow(DomainException);
    expect(p.stock).toBe(2);
  });

  it('0 이하 수량은 거부한다', () => {
    const p = newProduct();
    expect(() => p.decreaseStock(0)).toThrow(DomainException);
    expect(() => p.decreaseStock(-1)).toThrow(DomainException);
  });

  it('취소 시 재고를 복구한다', () => {
    const p = newProduct(5);
    p.decreaseStock(2);
    p.restoreStock(2);
    expect(p.stock).toBe(5);
  });

  it('이름이 비면 거부한다', () => {
    expect(() => Product.create({ name: '  ', price: Money.of(1000), stock: 1 })).toThrow(
      DomainException,
    );
  });
});
