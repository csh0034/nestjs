import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const handler = `${context.getClass().name}#${context.getHandler().name}`;
    const startedAt = Date.now();

    this.logger.log(`-> ${req.method} ${req.url} (${handler})`);

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startedAt;
          this.logger.log(`<- ${req.method} ${req.url} (${handler}) ${elapsed}ms`);
        },
        error: (err: Error) => {
          const elapsed = Date.now() - startedAt;
          this.logger.warn(
            `xx ${req.method} ${req.url} (${handler}) ${elapsed}ms : ${err.message}`,
          );
        },
      }),
    );
  }
}
