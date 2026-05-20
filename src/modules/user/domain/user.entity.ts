import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { Email } from './email.vo';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity({ tableName: 'users' })
export class User extends AggregateRoot {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  name!: string;

  @Enum({ items: () => UserRole })
  role!: UserRole;

  @Property()
  createdAt: Date = new Date();

  static create(params: { email: Email; name: string; role?: UserRole }): User {
    const user = new User();
    user.id = randomUUID();
    user.email = params.email.value;
    user.name = params.name;
    user.role = params.role ?? UserRole.USER;
    return user;
  }
}
