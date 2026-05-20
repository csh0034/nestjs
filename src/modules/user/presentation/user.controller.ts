import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateUserUseCase } from '../application/commands/create-user.use-case';
import { GetUserUseCase } from '../application/queries/get-user.use-case';
import { CreateUserRequest } from './dto/create-user.request';
import { User } from '../domain/user.entity';

interface UserView {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

function toView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

@Controller('users')
export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateUserRequest): Promise<UserView> {
    const user = await this.createUser.execute(body);
    return toView(user);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserView> {
    const user = await this.getUser.execute(id);
    return toView(user);
  }
}
