import { ValueObject } from './value-object';
import { DomainException } from './domain-exception';

interface MoneyProps {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static of(amount: number, currency = 'KRW'): Money {
    if (!Number.isFinite(amount)) {
      throw new DomainException(`invalid money amount: ${amount}`);
    }
    if (amount < 0) {
      throw new DomainException(`money amount must be >= 0: ${amount}`);
    }
    return new Money({ amount, currency });
  }

  static zero(currency = 'KRW'): Money {
    return Money.of(0, currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new DomainException(`multiply factor must be non-negative integer: ${factor}`);
    }
    return Money.of(this.amount * factor, this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException(`currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
