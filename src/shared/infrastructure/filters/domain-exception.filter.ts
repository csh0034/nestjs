import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { DomainException, NotFoundDomainException } from '../../domain/domain-exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof NotFoundDomainException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

    this.logger.warn(`${exception.name}: ${exception.message}`);

    res.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
