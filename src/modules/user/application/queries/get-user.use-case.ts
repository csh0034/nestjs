import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case';
import { NotFoundDomainException } from '../../../../shared/domain/domain-exception';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class GetUserUseCase implements UseCase<string, User> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundDomainException(`user not found: ${id}`);
    }
    return user;
  }
}
