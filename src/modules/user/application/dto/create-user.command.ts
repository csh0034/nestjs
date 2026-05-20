import { UserRole } from '../../domain/user.entity';

export interface CreateUserCommand {
  email: string;
  name: string;
  role?: UserRole;
}
