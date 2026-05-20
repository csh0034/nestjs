import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case';
import { DomainException } from '../../../../shared/domain/domain-exception';
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/email.vo';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { CreateUserCommand } from '../dto/create-user.command';

@Injectable()
export class CreateUserUseCase implements UseCase<CreateUserCommand, User> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(input: CreateUserCommand): Promise<User> {
    const email = Email.of(input.email);

    const duplicated = await this.users.findByEmail(email.value);
    if (duplicated) {
      throw new DomainException(`email already exists: ${email.value}`);
    }

    const user = User.create({ email, name: input.name, role: input.role });
    await this.users.save(user);
    return user;
  }
}
