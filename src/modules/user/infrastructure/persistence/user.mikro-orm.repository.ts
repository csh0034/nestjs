import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mariadb';
import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';

@Injectable()
export class UserMikroOrmRepository implements UserRepository {
  constructor(private readonly em: EntityManager) {}

  async save(user: User): Promise<void> {
    await this.em.persistAndFlush(user);
  }

  findById(id: string): Promise<User | null> {
    return this.em.findOne(User, { id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email });
  }
}
