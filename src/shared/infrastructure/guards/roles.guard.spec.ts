import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('@Roles 메타데이터가 없으면 통과한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('헤더의 x-role 이 일치하면 통과한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return ['admin'];
      return undefined;
    });
    expect(guard.canActivate(makeContext({ 'x-role': 'admin' }))).toBe(true);
  });

  it('헤더의 x-role 이 다르면 거부한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return ['admin'];
      return undefined;
    });
    expect(guard.canActivate(makeContext({ 'x-role': 'user' }))).toBe(false);
  });

  it('대소문자 차이는 무시한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return ['ADMIN'];
      return undefined;
    });
    expect(guard.canActivate(makeContext({ 'x-role': 'admin' }))).toBe(true);
  });

  it('헤더가 없으면 거부한다', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === ROLES_KEY) return ['admin'];
      return undefined;
    });
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });
});
