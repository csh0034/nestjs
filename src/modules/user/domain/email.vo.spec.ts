import { Email } from './email.vo';
import { DomainException } from '../../../shared/domain/domain-exception';

describe('Email', () => {
  it('소문자로 정규화한다', () => {
    expect(Email.of('  Foo@Bar.COM ').value).toBe('foo@bar.com');
  });

  it('형식이 맞지 않으면 거부한다', () => {
    expect(() => Email.of('not-email')).toThrow(DomainException);
    expect(() => Email.of('a@b')).toThrow(DomainException);
    expect(() => Email.of('')).toThrow(DomainException);
  });
});
