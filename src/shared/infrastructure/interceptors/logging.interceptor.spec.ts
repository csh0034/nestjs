import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function makeContext(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/x' }),
    }),
    getClass: () => ({ name: 'C' }) as never,
    getHandler: () => ({ name: 'h' }) as never,
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  it('정상 응답 시 진입/종료 로그를 모두 남긴다', async () => {
    const interceptor = new LoggingInterceptor();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const handler: CallHandler = { handle: () => of({ ok: true }) };
    const result = await firstValueFrom(interceptor.intercept(makeContext(), handler));

    expect(result).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledTimes(2);

    logSpy.mockRestore();
  });

  it('에러 시 warn 로그를 남기고 에러를 전파한다', async () => {
    const interceptor = new LoggingInterceptor();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const handler: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(firstValueFrom(interceptor.intercept(makeContext(), handler))).rejects.toThrow(
      'boom',
    );
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
