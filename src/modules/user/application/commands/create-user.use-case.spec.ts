import { CreateUserUseCase } from './create-user.use-case';
import { UserRepository } from '../../domain/user.repository';
import { User, UserRole } from '../../domain/user.entity';
import { DomainException } from '../../../../shared/domain/domain-exception';

class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>();

  save(user: User): Promise<void> {
    this.store.set(user.id, user);
    return Promise.resolve();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    for (const u of this.store.values()) {
      if (u.email === email) return Promise.resolve(u);
    }
    return Promise.resolve(null);
  }
}

describe('CreateUserUseCase', () => {
  let repo: InMemoryUserRepository;
  let sut: CreateUserUseCase;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    sut = new CreateUserUseCase(repo);
  });

  it('정상 입력이면 사용자를 생성한다', async () => {
    const user = await sut.execute({ email: 'a@b.com', name: 'kim', role: UserRole.ADMIN });
    expect(user.email).toBe('a@b.com');
    expect(user.role).toBe(UserRole.ADMIN);
    expect(await repo.findByEmail('a@b.com')).not.toBeNull();
  });

  it('role 미지정시 USER 로 기본 설정된다', async () => {
    const user = await sut.execute({ email: 'a@b.com', name: 'kim' });
    expect(user.role).toBe(UserRole.USER);
  });

  it('중복 이메일은 거부한다', async () => {
    await sut.execute({ email: 'a@b.com', name: 'kim' });
    await expect(sut.execute({ email: 'A@B.com', name: 'kim2' })).rejects.toThrow(DomainException);
  });

  it('형식이 잘못된 이메일은 거부한다', async () => {
    await expect(sut.execute({ email: 'invalid', name: 'kim' })).rejects.toThrow(DomainException);
  });
});
