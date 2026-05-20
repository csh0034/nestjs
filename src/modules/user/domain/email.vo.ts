import { ValueObject } from '../../../shared/domain/value-object';
import { DomainException } from '../../../shared/domain/domain-exception';

interface EmailProps {
  value: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static of(value: string): Email {
    const trimmed = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new DomainException(`invalid email: ${value}`);
    }
    return new Email({ value: trimmed });
  }

  get value(): string {
    return this.props.value;
  }
}
