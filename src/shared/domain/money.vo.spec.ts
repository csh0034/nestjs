import { Money } from './money.vo';
import { DomainException } from './domain-exception';

describe('Money', () => {
  it('생성 시 음수는 거부한다', () => {
    expect(() => Money.of(-1)).toThrow(DomainException);
  });

  it('NaN/Infinity 는 거부한다', () => {
    expect(() => Money.of(Number.NaN)).toThrow(DomainException);
    expect(() => Money.of(Number.POSITIVE_INFINITY)).toThrow(DomainException);
  });

  it('같은 통화끼리 더할 수 있다', () => {
    const sum = Money.of(1000).add(Money.of(500));
    expect(sum.amount).toBe(1500);
    expect(sum.currency).toBe('KRW');
  });

  it('통화가 다르면 합산을 거부한다', () => {
    expect(() => Money.of(1000, 'KRW').add(Money.of(1, 'USD'))).toThrow(DomainException);
  });

  it('정수 배수만 허용한다', () => {
    expect(Money.of(1000).multiply(3).amount).toBe(3000);
    expect(() => Money.of(1000).multiply(1.5)).toThrow(DomainException);
    expect(() => Money.of(1000).multiply(-2)).toThrow(DomainException);
  });

  it('값과 통화가 같으면 동등하다', () => {
    expect(Money.of(1000).equals(Money.of(1000))).toBe(true);
    expect(Money.of(1000).equals(Money.of(1000, 'USD'))).toBe(false);
  });
});
