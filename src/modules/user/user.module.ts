import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from './domain/user.entity';
import { USER_REPOSITORY } from './domain/user.repository';
import { UserMikroOrmRepository } from './infrastructure/persistence/user.mikro-orm.repository';
import { CreateUserUseCase } from './application/commands/create-user.use-case';
import { GetUserUseCase } from './application/queries/get-user.use-case';
import { UserController } from './presentation/user.controller';

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    GetUserUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserMikroOrmRepository,
    },
  ],
  exports: [USER_REPOSITORY, GetUserUseCase],
})
export class UserModule {}
