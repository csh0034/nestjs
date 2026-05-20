import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../domain/user.entity';

export class CreateUserRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
